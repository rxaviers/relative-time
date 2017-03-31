# Relative Time

Formats JavaScript dates to relative time strings (e.g., "3 hours ago").

Based on the [Unicode CLDR][] locale data. Powered by [globalizejs/globalize][].

[Unicode CLDR]: http://cldr.unicode.org/
[globalizejs/globalize]: http://globalizejs.com/

## Why

- Leverages Unicode CLDR (via [Globalize](http://globalizejs.com)), the largest and most extensive standard repository of locale data available.
  - It also means messages like `"today"`, `"yesterday"`, `"last month"` are available and properly localized in the various CLDR supported locales.
- What you get is correct, for example:

#### day

```
       Mar 21, 00:00           Mar 22, 00:00           Mar 23, 00:00           Mar 24, 00:00
hr.  | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
day    |                    b  |          a            |        N              |
       Mar 21                  Mar 22                  Mar 23                  Mar 24    

```

Let's assume now (`N`) is *Mar 23, 9 AM*.

|                       | rxaviers/relative-time | moment.js       |
| --------------------- | ---------------------- | --------------- |
| *Mar 22, 11 AM* (`a`) | `"yesterday"`          | `"a day ago"`   |
| *Mar 21, 8 PM* (`b`)  | `"2 days ago"`         | `"a day ago"` ❓ |

Note `rxaviers/relative-time` checks for the actual day change instead of counting on approximate number of hours to turn the unit.

#### month

```
    Feb 1                        Mar 1                           Apr 1
day  | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
mo.  |       d                  c|b   a                         N|
```

Let's assume now (`N`) is *Mar 31*.

|                | rxaviers/relative-time | moment.js          |
| -------------- | ---------------------- | ------------------ |
| *Mar 5* (`a`)  | `"26 days ago"`        | `"a month ago"` ❓  |
| *Mar 1* (`b`)  | `"30 days ago"`        | `"a month ago"` ❓  |
| *Feb 28* (`c`) | `"last month"`         | `"a month ago"`    |
| *Feb 9* (`d`)  | `"last month"`         | `"2 months ago"` ❓ |

Note `rxaviers/relative-time` checks for the actual month change instead of counting on approximate number of days to turn the unit.

## Usage

    npm install --save relative-time globalize cldr-data

```js
var cldrData = require("cldr-data");
var Globalize = require("globalize");
var RelativeTime = require("relative-time");

// Feed Globalize on CLDR.
Globalize.load(cldrData.entireSupplemental(), cldrData.entireMainFor("en"));
Globalize.locale("en");

var relativeTime = new RelativeTime();
console.log(relativeTime.format(new Date()));
// > now
```

## API

### `format(date{, options})`

### date

### options.unit

Unit for formatting. If the unit is not provided, `"best-fit"` is used.

- `"best-fit"` (default)
- `"second"`
- `"minute"`
- `"hour"`
- `"day"`
- `"month"`
- `"year"`

#### The `"best-fit"` unit

It automatically picks a unit based on the relative time scale. Basically, it looks like this:

- If `absDiffYears > 0 && absDiffMonths > threshold.month`, return `"year"`.
- If `absDiffMonths > 0 && absDiffWeeks > threshold.week`, return `"month"`.
- If `absDiffWeeks > 0 && absDiffDays > threshold.day`, return `"week"`.
- If `absDiffDays > 0 && absDiffHours > threshold.hour`, return `"day"`.
- If `absDiffHours > 0 && absDiffMinutes > threshold.minute`, return `"hour"`.
- If `absDiffMinutes > 0 && absDiffSeconds > threshold.second`, return `"minutes"`.
- Return `"second"`.

## Appendix

### Relative time

In this library, we'll define relative time as what makes sense for expressions like "now", "2 days ago", "in 3 months", "last year", "yesterday", and so on. In a more formal definition, *relative time* is an approximate date distance given a unit. This is, *relative time* is the date distance of *a* and *b* ± error, where error < unit. Please, see the below examples of each unit for clarity.

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
