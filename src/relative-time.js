const root = typeof global !== "undefined" ? global :
  typeof window !== "undefined" ? window :
  typeof self !== "undefined" ? self : {};

function getTemporal() {
  var Temporal = root.Temporal;
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
  if (typeof zone === "string") {
    return zone;
  }
  if (zone && typeof zone.id === "string") {
    return zone.id;
  }
  return zone;
}

function ensureZonedDateTime(value, Temporal) {
  if (isTemporalZonedDateTime(value, Temporal)) {
    return value;
  }
  if (isTemporalInstant(value, Temporal)) {
    throw new TypeError("Temporal.Instant inputs require a reference time zone");
  }
  throw new TypeError("Unsupported date value; expected Temporal.Instant or Temporal.ZonedDateTime");
}

function differenceInUnit(now, target, unit) {
  var duration = now.until(target, {
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
    var Temporal = getTemporal();
    var resolvedNow = now;
    if (resolvedNow !== undefined && resolvedNow !== null) {
      resolvedNow = ensureZonedDateTime(resolvedNow, Temporal);
    }

    var target;
    if (isTemporalZonedDateTime(date, Temporal)) {
      target = date;
      var zoneLike = toTimeZoneIdentifier(target.timeZone);
      if (resolvedNow) {
        resolvedNow = resolvedNow.withTimeZone(zoneLike);
      } else {
        resolvedNow = Temporal.Now.zonedDateTimeISO(zoneLike);
      }
    } else if (isTemporalInstant(date, Temporal)) {
      if (!resolvedNow) {
        resolvedNow = Temporal.Now.zonedDateTimeISO();
      }
      target = date.toZonedDateTimeISO(resolvedNow.timeZone);
    } else {
      throw new TypeError("Unsupported date value; expected Temporal.Instant or Temporal.ZonedDateTime");
    }

    var diff = {};
    ["year", "month", "day", "hour", "minute", "second"].forEach(function(currentUnit) {
      diff[currentUnit] = differenceInUnit(resolvedNow, target, currentUnit);
    });

    var absDiff = {};
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
  var threshold = this.threshold;
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
  var locales = localesOrFormatter;
  var formatOptions = options;

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
