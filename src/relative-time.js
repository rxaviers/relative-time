const root = typeof global !== "undefined" ? global :
  typeof window !== "undefined" ? window :
  typeof self !== "undefined" ? self : {};

function getTemporal() {
  const Temporal = root.Temporal;
  if (!Temporal) {
    throw new TypeError("Temporal is required to use relative-time");
  }
  return Temporal;
}

function isTemporalZonedDateTime(value, Temporal) {
  return Boolean(Temporal.ZonedDateTime && value instanceof Temporal.ZonedDateTime);
}

function isTemporalPlainDateTime(value, Temporal) {
  return Boolean(Temporal.PlainDateTime && value instanceof Temporal.PlainDateTime);
}

function resolvePlainNow(now, Temporal, target) {
  if (now === undefined || now === null) {
    const current = Temporal.Now.plainDateTimeISO();
    return typeof current.withCalendar === "function" && target.calendar ?
      current.withCalendar(target.calendar) : current;
  }

  if (!isTemporalPlainDateTime(now, Temporal)) {
    throw new TypeError("Unsupported now value; expected Temporal.PlainDateTime");
  }

  return typeof now.withCalendar === "function" && target.calendar ?
    now.withCalendar(target.calendar) : now;
}

function resolveZonedNow(now, Temporal, targetZone) {
  if (now === undefined || now === null) {
    return Temporal.Now.zonedDateTimeISO(targetZone);
  }

  if (!isTemporalZonedDateTime(now, Temporal)) {
    throw new TypeError("Unsupported now value; expected Temporal.ZonedDateTime");
  }

  return now.withTimeZone(targetZone);
}

function differenceInUnit(now, target, unit) {
  const duration = now.until(target, {
    largestUnit: unit,
    smallestUnit: unit,
    roundingMode: "trunc"
  });
  return duration[unit + "s"];
}

export default class RelativeTime {
  constructor() {
    this.formatters = RelativeTime.initializeFormatters(...arguments);
  }

  format(date, {unit = "best-fit", now} = {}) {
    const Temporal = getTemporal();
    let target;
    let resolvedNow;

    if (isTemporalZonedDateTime(date, Temporal)) {
      const targetZone = date.timeZoneId;
      target = date.withTimeZone(targetZone);
      resolvedNow = resolveZonedNow(now, Temporal, targetZone);
    } else if (isTemporalPlainDateTime(date, Temporal)) {
      target = date;
      resolvedNow = resolvePlainNow(now, Temporal, target);
    } else {
      throw new TypeError("Unsupported date value; expected Temporal.ZonedDateTime or Temporal.PlainDateTime");
    }

    const diff = {};
    ["year", "month", "day", "hour", "minute", "second"].forEach(function(currentUnit) {
      diff[currentUnit] = differenceInUnit(resolvedNow, target, currentUnit);
    });

    const absDiff = {};
    Object.keys(diff).forEach(function(currentUnit) {
      absDiff[currentUnit] = Math.abs(diff[currentUnit]);
    });

    if (unit === "best-fit") {
      unit = RelativeTime.bestFit(absDiff);
    }

    return this.formatters[unit](diff[unit]);
  }
}

RelativeTime.bestFit = function(absDiff) {
  const threshold = this.threshold;
  switch (true) {
    case absDiff.year > 0 && absDiff.month > threshold.month: return "year";
    case absDiff.month > 0 && absDiff.day > threshold.day: return "month";
    case absDiff.day > 0 && absDiff.hour > threshold.hour: return "day";
    case absDiff.hour > 0 && absDiff.minute > threshold.minute: return "hour";
    case absDiff.minute > 0 && absDiff.second > threshold.second: return "minute";
    default: return "second";
  }
};

RelativeTime.threshold = {
  month: 2,
  day: 6,
  hour: 6,
  minute: 59,
  second: 59
};

RelativeTime.initializeFormatters = function(localesOrFormatter, options) {
  let locales = localesOrFormatter;
  let formatOptions = options;

  if (localesOrFormatter && typeof localesOrFormatter.format === "function" &&
      typeof localesOrFormatter.resolvedOptions === "function") {
    return createFormatterMap(localesOrFormatter);
  }

  if (localesOrFormatter && typeof localesOrFormatter === "object" && !Array.isArray(localesOrFormatter)) {
    formatOptions = localesOrFormatter;
    locales = undefined;
  }

  return createFormatterMap(new Intl.RelativeTimeFormat(locales, Object.assign({
    numeric: "auto"
  }, formatOptions)));
};

function createFormatterMap(formatter) {
  return ["second", "minute", "hour", "day", "month", "year"].reduce(function(map, unit) {
    map[unit] = function(value) {
      return formatter.format(value, unit);
    };
    return map;
  }, {});
}
