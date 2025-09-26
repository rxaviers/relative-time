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

function isTemporalInstant(value, Temporal) {
  return Boolean(Temporal.Instant && value instanceof Temporal.Instant);
}

function isTemporalZonedDateTime(value, Temporal) {
  return Boolean(Temporal.ZonedDateTime && value instanceof Temporal.ZonedDateTime);
}

function toTimeZoneIdentifier(zone) {
  if (zone === undefined || zone === null) {
    return zone;
  }
  if (typeof zone === "string") {
    return zone;
  }
  if (zone && typeof zone.id === "string") {
    return zone.id;
  }
  throw new TypeError("Unsupported time zone; expected a string or Temporal.TimeZone");
}

function resolveNow(now, Temporal, zone) {
  if (now === undefined || now === null) {
    if (zone !== undefined) {
      return Temporal.Now.zonedDateTimeISO(zone);
    }
    return Temporal.Now.zonedDateTimeISO();
  }

  if (isTemporalZonedDateTime(now, Temporal)) {
    if (zone !== undefined) {
      return now.withTimeZone(zone);
    }
    return now;
  }

  if (isTemporalInstant(now, Temporal)) {
    if (zone === undefined) {
      throw new TypeError("Temporal.Instant `now` values require a timeZone option or ZonedDateTime input");
    }
    return now.toZonedDateTimeISO(zone);
  }

  throw new TypeError("Unsupported now value; expected Temporal.Instant or Temporal.ZonedDateTime");
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

  format(date, {unit = "best-fit", now, timeZone} = {}) {
    const Temporal = getTemporal();
    let target;
    let resolvedNow;
    let normalizedZone = toTimeZoneIdentifier(timeZone);

    if (isTemporalZonedDateTime(date, Temporal)) {
      const originalZone = toTimeZoneIdentifier(date.timeZone);
      const targetZone = normalizedZone || originalZone;
      target = originalZone === targetZone ? date : date.withTimeZone(targetZone);
      normalizedZone = targetZone;
      resolvedNow = resolveNow(now, Temporal, normalizedZone);
    } else if (isTemporalInstant(date, Temporal)) {
      let instantZone = normalizedZone;

      if (!instantZone) {
        if (isTemporalZonedDateTime(now, Temporal)) {
          instantZone = toTimeZoneIdentifier(now.timeZone);
        } else if (now === undefined || now === null) {
          resolvedNow = Temporal.Now.zonedDateTimeISO();
          instantZone = toTimeZoneIdentifier(resolvedNow.timeZone);
        } else {
          throw new TypeError("Temporal.Instant inputs require a timeZone option or ZonedDateTime `now` value");
        }
      }

      if (!resolvedNow) {
        resolvedNow = resolveNow(now, Temporal, instantZone);
      } else {
        resolvedNow = resolvedNow.withTimeZone(instantZone);
      }

      target = date.toZonedDateTimeISO(instantZone);
      normalizedZone = instantZone;
    } else {
      throw new TypeError("Unsupported date value; expected Temporal.Instant or Temporal.ZonedDateTime");
    }

    if (!normalizedZone) {
      normalizedZone = toTimeZoneIdentifier(target.timeZone);
      resolvedNow = resolvedNow.withTimeZone(normalizedZone);
      target = target.withTimeZone(normalizedZone);
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
