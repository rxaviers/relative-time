# Relative Time

Formats Temporal dates to relative time strings (e.g., "3 hours ago") using the
same standards that ship in modern JavaScript engines.

Pass a [`Temporal.PlainDateTime`](https://tc39.es/proposal-temporal/docs/plaindatetime.html)
when the comparison does not depend on a particular time zone, or a
[`Temporal.ZonedDateTime`](https://tc39.es/proposal-temporal/docs/zoneddatetime.html)
to evaluate the difference within an explicit IANA zone.

Built entirely on [Temporal](https://tc39.es/proposal-temporal/) for duration
calculations and the native [Intl.RelativeTimeFormat][] API (ECMA-402) for
localization, so you get spec-compliant results without extra runtime
dependencies.

The usage examples below assume [Temporal](https://tc39.es/proposal-temporal/) is available (either natively or via the
[@js-temporal/polyfill](https://github.com/js-temporal/temporal-polyfill)).

[Unicode CLDR]: http://cldr.unicode.org/
[Intl.RelativeTimeFormat]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat

## Why

### Built on native web standards

Temporal handles the date math while [Intl.RelativeTimeFormat][] provides the
localized strings, so the library always uses the same Unicode CLDR data that
ships with the runtime. There are no custom heuristics, shimmed tokens, or
vendor-specific formatting rules to maintain.

Standard APIs also mean the examples in this README run anywhere Temporal is
available (including via the official polyfill) and benefit from future engine
improvements automatically.

### Time zone support

Temporal.ZonedDateTime inputs preserve the offset and daylight-saving rules for
each region, so the formatter stays accurate even when comparing the same instant
across different cities. The chart below shows how two zones perceive the same
event (`x`) and “now” (`N`).

```
hr.  | | | | | | | | | | | | | | | | | | | | | | | |
       x . . . . . . . . . . . . . . . . . . | . N
EDT      <------------ Mar 21 -----------> | <-----> (Mar 22)
PDT      <----------------- Mar 21 ---------------->
```

New York crosses midnight between `x` and `N`, so the event reads as “yesterday”,
but Los Angeles does not, yielding “21 hours ago”.
The relative time between `x` and now `N` is:

| time zone           | relative-time result |
| ------------------- | -------------------- |
| America/New_York    | `"yesterday"`        |
| America/Los_Angeles | `"21 hours ago"`     |

### Better results than other libraries

Other open-source relative time utilities rely on hand-tuned thresholds that can
misreport day or month boundaries. Because this project delegates that logic to
Temporal and CLDR data, it keeps human language aligned with calendar reality.
The comparisons below highlight real cases where Moment.js and similar libraries
fall short.

#### day

```
       Mar 21, 00:00           Mar 22, 00:00           Mar 23, 00:00           Mar 24, 00:00
hr.  | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
day    |                    b  |          a            |        N              |
       Mar 21                  Mar 22                  Mar 23                  Mar 24

```

Let's assume now (`N`) is _Mar 23, 9 AM_.

|                       | relative-time  | moment.js        |
| --------------------- | -------------- | ---------------- |
| _Mar 22, 11 AM_ (`a`) | `"yesterday"`  | `"a day ago"`    |
| _Mar 21, 8 PM_ (`b`)  | `"2 days ago"` | `"a day ago"` ❓ |

Note `relative-time` checks for the actual day change instead of counting on approximate number of hours to turn the unit.

#### month

```
    Feb 1                        Mar 1                           Apr 1
day  | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
mo.  |       d                  c|b   a                         N|
```

Let's assume now (`N`) is _Mar 31_.

|                | relative-time   | moment.js           |
| -------------- | --------------- | ------------------- |
| _Mar 5_ (`a`)  | `"26 days ago"` | `"a month ago"` ❓  |
| _Mar 1_ (`b`)  | `"30 days ago"` | `"a month ago"` ❓  |
| _Feb 28_ (`c`) | `"last month"`  | `"a month ago"`     |
| _Feb 9_ (`d`)  | `"last month"`  | `"2 months ago"` ❓ |

Note `relative-time` checks for the actual month change instead of counting on approximate number of days to turn the unit.

## Usage

    npm install --save relative-time

```js
import RelativeTime, { RelativeTimeResolver } from "relative-time";

const relativeTime = new RelativeTime();
const threeHoursAgo = Temporal.Now.plainDateTimeISO().subtract({ hours: 3 });
console.log(relativeTime.format(threeHoursAgo));
// > 3 hours ago

const relativeTimeInPortuguese = new RelativeTime("pt");
const oneHourAgo = Temporal.Now.plainDateTimeISO().subtract({ hours: 1 });
console.log(relativeTimeInPortuguese.format(oneHourAgo));
// > há 1 hora

// Use the resolver when you need just the unit/value
const resolver = new RelativeTimeResolver();
const event = Temporal.Now.plainDateTimeISO().subtract({ minutes: 3 });
const { value, unit } = resolver.resolve(event); // { value: -3, unit: "minute" }
// You can format this yourself or with Intl.RelativeTimeFormat
new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(value, unit);
// > 3 minutes ago
```

### Time zone support

When you need to evaluate relative time in a different IANA time zone, create a
`Temporal.ZonedDateTime` in that zone before calling `format`.

|      | America/Los_Angeles             | Europe/Berlin                                            |
| ---- | ------------------------------- | -------------------------------------------------------- |
| date | 2016-04-09 17:00:00 GMT-7 (PDT) | 2016-04-10 02:00:00 GMT+2 (Central European Summer Time) |
| now  | 2016-04-10 05:00:00 GMT-7 (PDT) | 2016-04-10 14:00:00 GMT+2 (Central European Summer Time) |

```js
const losAngelesDate = Temporal.ZonedDateTime.from(
  "2016-04-09T17:00:00-07:00[America/Los_Angeles]"
);
relativeTime.format(losAngelesDate, { now: losAngelesNow });
// > "yesterday"

const berlinDate = Temporal.ZonedDateTime.from(
  "2016-04-10T02:00:00+02:00[Europe/Berlin]"
);
relativeTime.format(berlinDate, { now: berlinNow });
// > "12 hours ago"
```

## API

### RelativeTime (default export)

#### `format(date{, options})`

### date

A [Temporal.PlainDateTime](https://tc39.es/proposal-temporal/docs/plaindatetime.html)
or [Temporal.ZonedDateTime](https://tc39.es/proposal-temporal/docs/zoneddatetime.html)
representing the target moment. Use a plain date-time when the relative distance
should ignore time zone rules (for example, comparing two local calendar events)
and a zoned date-time when offset and daylight-saving changes matter.

#### options.unit (optional)

Unit for formatting. If the unit is not provided, `"best-fit"` is used.

- `"best-fit"` (default)
- `"second"`
- `"minute"`
- `"hour"`
- `"day"`
- `"month"`
- `"year"`

#### The `"best-fit"` unit

It automatically picks a unit based on the relative time scale using thresholds. In short:

- If `absDiff.year > 0 && absDiff.month > threshold.month` → `"year"`
- If `absDiff.month > 0 && absDiff.day > threshold.day` → `"month"`
- If `absDiff.day > 0 && absDiff.hour > threshold.hour` → `"day"`
- If `absDiff.hour > 0 && absDiff.minute > threshold.minute` → `"hour"`
- If `absDiff.minute > 0 && absDiff.second > threshold.second` → `"minute"`
- Otherwise → `"second"`

#### options.now (optional)

A [Temporal.PlainDateTime](https://tc39.es/proposal-temporal/docs/plaindatetime.html)
or [Temporal.ZonedDateTime](https://tc39.es/proposal-temporal/docs/zoneddatetime.html)
representing the reference point used to compute the relative difference. When
omitted, the current moment is retrieved with
[`Temporal.Now`](https://tc39.es/proposal-temporal/docs/now.html) and evaluated as
either a plain or zoned date-time to match the type of `date`. Passing any other
type throws a `TypeError`.

#### Return

Returns the formatted relative time string given `date` and `options`.

### RelativeTimeResolver (named export)

Resolves the relative difference without formatting, returning `{ value, unit }`.

#### Constructor

`new RelativeTimeResolver(options?)`

- `options.threshold` — override the thresholds used by best-fit.
- `options.units` — override the units considered by the resolver.

#### `resolve(date, { now, unit = "best-fit" } = {})`

- `date` — `Temporal.PlainDateTime` or `Temporal.ZonedDateTime`.
- `now` — must match the `date` type; for zoned dates, the time zone must match. If omitted, `Temporal.Now` is used accordingly.
- `unit` —
  - `"best-fit"` (default): chooses a unit using thresholds and returns `{ unit, value }`.
  - Any supported unit (`second`, `minute`, `hour`, `day`, `month`, `year`): returns `{ unit, value }` using that exact unit (signed, truncated difference). The hour edge-case is handled so very recent past returns `-1` hour instead of `0` hours.

#### Return

An object `{ value, unit }` with the signed difference and chosen unit.

## Appendix

### Relative time

In this library, we'll define relative time as what makes sense for expressions like "now", "2 days ago", "in 3 months", "last year", "yesterday", and so on. In a more formal definition, _relative time_ is an approximate date distance given a unit. This is, _relative time_ is the date distance of _a_ and _b_ ± error, where error < unit. Please, see the below examples of each unit for clarity.

#### second

```
                8:31:38.000         8:31:39.000         8:31:40.000         8:31:41.000
ms  | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
sec             |   e             d |   c             b |       a     N     |
                8:31:38             8:31:39             8:31:40             8:31:41

N: The assumed now
a: now / 0 seconds ago
b: 1 second ago
c: 1 second ago
d: 2 seconds ago
e: 2 seconds ago
```

#### minute

```
          8:28:00           8:29:00           8:30:00           8:31:00           8:32:00
sec |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
min       |     g        f  |     e        d  |     c        b  |        a  N     |
          8:28              8:29              8:30              8:31              8:32

N: The assumed now
a: 0 minutes ago
b: 1 minute ago
c: 1 minute ago
d: 2 minutes ago
e: 2 minutes ago
f: 3 minutes ago
g: 3 minutes ago
```

#### hour

```
          5:00              6:00              7:00              8:00              9:00
min |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
hr.       |     g        f  |     e        d  |     c        b  |     a  N        |
          5                 6                 7                 8                 9

N: The assumed now
a: 0 hours ago
b: 1 hour ago
c: 1 hour ago
d: 2 hours ago
e: 2 hours ago
f: 3 hours ago
g: 3 hours ago
```

#### day

```
       Mar 21, 00:00           Mar 22, 00:00           Mar 23, 00:00           Mar 24, 00:00
hr.  | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
day    | e                   d | c                   b |     a N               |
       Mar 21                  Mar 22                  Mar 23                  Mar 24

N: The assumed now
a: today / 0 days ago
b: yesterday / 1 day ago
c: yesterday / 1 day ago
d: 2 days ago
e: 2 days ago
```

#### week

```
                     Wk. 11, Sun, Mar 12  Wk. 12, Sun, Mar 19  Wk. 13, Sun, Mar 26
day   |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
wk.   e           d  |     c             b|       a    N       |
                     Wk 11                Wk 12                Wk 13

N: The assumed now
a: this week
b: last week
c: last week
d: 2 weeks ago
e: 2 weeks ago
```

#### month

```
      Wk. 1       Wk. 5       Wk. 9          Wk. 14
wk.   |  |  |  |  |  |  |  |  |  |  |  |  |  |
mo.   |e         d | c        b|     a   N   |
      Jan          Feb         Mar           Apr

N: The assumed now
a: this month / 0 months ago
b: last month / 1 month ago
c: last month / 1 month ago
d: 2 months ago
e: 2 months ago
```

Note the months distances doesn't match weeks distance or days distance uniformly.

#### year

```
          Jan               Jan               Jan               Jan               Jan
mo. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
yr.       |g             f  |e             d  |c             b  |a  N             |
          2013              2014              2015              2016              2017

N: The assumed now
a: this year / 0 years ago
b: last year / 1 year ago
c: last year / 1 year ago
d: 2 years ago
e: 2 years ago
f: 3 years ago
g: 3 years ago
```

Note that (although not shown by the above ruler), the years distances doesn't match weeks distance or days distance uniformly.

## License

MIT © [Rafael Xavier de Souza](http://rafael.xavier.blog.br)
