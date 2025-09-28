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
    if (!isTemporalZonedDateTime(date, Temporal)) {
      throw new TypeError("Unsupported date value; expected Temporal.ZonedDateTime");
    }

    const targetZone = date.timeZoneId;
    const target = date.withTimeZone(targetZone);
    let resolvedNow;

    if (now === undefined || now === null) {
      resolvedNow = Temporal.Now.zonedDateTimeISO(targetZone);
    } else if (isTemporalZonedDateTime(now, Temporal)) {
      resolvedNow = now.withTimeZone(targetZone);
    } else {
      throw new TypeError("Unsupported now value; expected Temporal.ZonedDateTime");
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
