# Relative Time

Formats JavaScript dates to localized **relative time strings** (e.g., "3 hours ago", "yesterday", "in 2 weeks").
It selects a **best‑fit unit** for you (seconds → minutes → hours → days → weeks → months → years) **and** uses the platform’s `Intl.RelativeTimeFormat` for localization.

- **High‑level**: `RelativeTime` → _resolve unit_ → format
- **Low‑level**: `RelativeTimeResolver` → _resolve only_ the `{ value, unit }`

Built on **Temporal** for precise date math and **Intl.RelativeTimeFormat** for i18n. That means you get the **same CLDR data** your runtime ships with—no locale bundles to download.

> **Why not just `Intl.RelativeTimeFormat`?**
> `Intl.RelativeTimeFormat` is intentionally **low level**: you must choose the unit yourself (e.g., day vs week) and then ask it to format the pair `{value, unit}`. This library adds the **unit resolver** layer on top—by design that’s out of scope for the built‑in API. (see more details at [tc39/proposal-intl-relative-time#14](https://github.com/tc39/proposal-intl-relative-time/issues/14))

## Install

```bash
npm install relative-time
# If your environment doesn't yet support Temporal:
npm install @js-temporal/polyfill
```

> This library expects **Temporal**. Use it where Temporal is available (or load the official polyfill).

## Quick start

```js
import RelativeTime from "relative-time";
// If needed:
// import { Temporal } from "@js-temporal/polyfill";

const rt = new RelativeTime(); // locale inferred from the runtime

const threeHoursAgo = Temporal.Now.plainDateTimeISO().subtract({ hours: 3 });
rt.format(threeHoursAgo);
// Output: "3 hours ago"

const pt = new RelativeTime("pt");
const oneHourAgo = Temporal.Now.plainDateTimeISO().subtract({ hours: 1 });
pt.format(oneHourAgo);
// Output: "há 1 hora"
```

### Time‑zone aware

```js
const rt = new RelativeTime();

const laDate = Temporal.ZonedDateTime.from(
  "2016-04-09T17:00:00-07:00[America/Los_Angeles]"
);
rt.format(laDate);
// Output: "yesterday"
// Assuming now is "2016-04-10T05:00:00-07:00[America/Los_Angeles]"

const berlinDate = Temporal.ZonedDateTime.from(
  "2016-04-10T02:00:00+02:00[Europe/Berlin]"
);
rt.format(berlinDate, { now: berlinNow });
// Output: "12 hours ago"
// Assuming now is "2016-04-10T14:00:00+02:00[Europe/Berlin]"
```

Use `Temporal.PlainDateTime` when you want to **ignore time‑zone rules** (local calendar math), and `Temporal.ZonedDateTime` when offset and DST **must** be respected.

### Resolver only

Use the resolver when you need just the unit/value.

```js
import { RelativeTimeResolver } from "relative-time";

const resolver = new RelativeTimeResolver();
const event = Temporal.Now.plainDateTimeISO().subtract({ minutes: 3 });
const { value, unit } = resolver.resolve(event);
// Output: { value: -3, unit: "minute" }

// You can format this yourself or with Intl.RelativeTimeFormat
new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(value, unit);
// Output: "3 minutes ago"
```

## API

### `class RelativeTime` (default export)

High‑level formatter that **resolves the unit** and **formats** the string.

#### Constructor

```ts
new RelativeTime(
  locales?: string | string[],
  options?: Intl.RelativeTimeFormatOptions
)
```

- `locales` — same semantics as other `Intl` constructors (e.g., `"en"`, `["fr", "en"]`).
- `options` — forwarded to `Intl.RelativeTimeFormat` (e.g., `{ style: "short", numeric: "auto" }`).
  Tip: `numeric: "auto"` yields strings like “yesterday/tomorrow”; `numeric: "always"` gives “1 day ago / in 1 day”.

#### `format(date, options?) => string`

```ts
format(
  date: Temporal.PlainDateTime | Temporal.ZonedDateTime,
  options?: {
    now?: Temporal.PlainDateTime | Temporal.ZonedDateTime,
    unit?: "best-fit" | "second" | "minute" | "hour" | "day" | "week" | "month" | "year"
  }
): string
```

- `date` — the target moment.
- `options.now` — reference moment (defaults to “now”, matched to `date`’s type).
- `options.unit` — force a specific unit or let the library decide with `"best-fit"` (default).

**How “best‑fit” works (conceptually)**

The resolver promotes units using _calendar boundaries_ and _configurable step-up thresholds_ (e.g., sec → min → hr → day → month). If the difference crosses a calendar day, you'll get _"yesterday"_ (instead of "20 hours ago"). But if it crosses midnight _without_ clearing the threshold, it stays in hours, e.g., _"3 hours ago"_ (instead of "yesterday").

---

### `class RelativeTimeResolver` (named export)

Low‑level **unit chooser**. Use it if you want the `{ value, unit }` pair to feed into your own formatter (including `Intl.RelativeTimeFormat` directly).

#### Constructor

```ts
new RelativeTimeResolver();
```

#### `resolve(date, options?) => { value: number, unit: RTFUnit }`

```ts
type RTFUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

resolve(
  date: Temporal.PlainDateTime | Temporal.ZonedDateTime,
  options?: {
    now?: Temporal.PlainDateTime | Temporal.ZonedDateTime,
    unit?: "best-fit" | RTFUnit  // "best-fit" (default) or force a unit
  }
): { value: number; unit: RTFUnit }
```

**Example**

```js
import { RelativeTimeResolver } from "relative-time";

const r = new RelativeTimeResolver();
const target = Temporal.Now.plainDateTimeISO().add({ days: 6, hours: 5 });

const { value, unit } = r.resolve(target); // e.g., { value: 1, unit: "week" }

new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(value, unit);
// "next week"
```

## Using `Intl.RelativeTimeFormat` options

You can customize style and numeric behavior at construction:

```js
const rtShort = new RelativeTime("en", { style: "short", numeric: "always" });
rtShort.format(Temporal.Now.plainDateTimeISO().subtract({ day: 1 }));
// "1 day ago"
```

> `RelativeTime` is literally a thin wrapper over `Intl.RelativeTimeFormat` once a `{ value, unit }` has been resolved. You get the same pluralization and grammar your engine provides.

## When to use which

| You need…                         | Use                                | Why                                                           |
| --------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| “Just give me a localized string” | `RelativeTime`                     | Picks a sensible unit and formats it                          |
| `{ value, unit }` only            | `RelativeTimeResolver`             | Feed another formatter, build custom UIs, analytics, etc.     |
| Full control over unit and i18n   | `Intl.RelativeTimeFormat` directly | Low‑level by design; no unit resolution provided by the spec. |

## Examples

**Force a unit**

```js
const rt = new RelativeTime("en");
rt.format(Temporal.Now.plainDateTimeISO().subtract({ hours: 27 }), {
  unit: "hour",
});
// "27 hours ago"
```

**Different locales**

```js
new RelativeTime(["fr", "en"]).format(
  Temporal.Now.plainDateTimeISO().add({ minutes: 5 })
);
// "dans 5 minutes"
```

## Notes on accuracy

This project uses **Temporal** for differences (calendar‑aware) and **`Intl.RelativeTimeFormat`** for localization. That combination prevents common errors around DST, month lengths, and week boundaries that “approximate threshold” libraries can exhibit.

## Browser / runtime support

- Works wherever **Temporal** is available; otherwise include **`@js-temporal/polyfill`**.
- Uses your runtime’s **`Intl.RelativeTimeFormat`**, which has wide support in modern environments.

## FAQ

**Does this support quarters?**
No—units are: `second`, `minute`, `hour`, `day`, `week`, `month`, `year`.

**Why do I sometimes see “yesterday” instead of “1 day ago”?**
That comes from `numeric: "auto"` in `Intl.RelativeTimeFormat`. Switch to `numeric: "always"` if you prefer numbers only.

**How is this different from the TC39 proposal?**
This library’s resolver is the high‑level part **omitted on purpose** from the `Intl.RelativeTimeFormat` spec; the built‑in API only formats a supplied `{ value, unit }`. See the historical discussion around “best‑fit” in the proposal repo.

## Contributing

PRs and issues welcome!

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

MIT © Rafael Xavier de Souza
