const root = typeof global !== "undefined" ? global :
  typeof window !== "undefined" ? window :
  typeof self !== "undefined" ? self : {};

function getTemporal() {
  return root.Temporal;
}

const offsetFormatters = new Map();

function isTemporalInstant(value) {
  var Temporal = getTemporal();
  return Boolean(Temporal && typeof Temporal.Instant === "function" && value instanceof Temporal.Instant);
}

function isTemporalZonedDateTime(value) {
  var Temporal = getTemporal();
  return Boolean(Temporal && typeof Temporal.ZonedDateTime === "function" && value instanceof Temporal.ZonedDateTime);
}

function toEpochMilliseconds(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (isTemporalInstant(value) || isTemporalZonedDateTime(value)) {
    return Number(value.epochMilliseconds);
  }

  throw new TypeError("Unsupported date value; expected Date, number, or Temporal Instant/ZonedDateTime");
}

function toDate(value) {
  if (value instanceof Date) {
    return value;
  }

  return new Date(toEpochMilliseconds(value));
}

function getOffsetFormatter(timeZone) {
  let formatter = offsetFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
    offsetFormatters.set(timeZone, formatter);
  }
  return formatter;
}

function parseOffsetMinutes(value) {
  if (value === "GMT" || value === "UTC") {
    return 0;
  }
  const match = value.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return 0;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  return -sign * (hours * 60 + minutes);
}

function getOffsetIndex(zoneData, timestamp) {
  const {untils} = zoneData;
  for (let i = 0; i < untils.length; i++) {
    const until = untils[i];
    if (until === null || timestamp < until) {
      return i;
    }
  }
  return untils.length - 1;
}

function getOffsetMinutesFromData(zoneData, timestamp) {
  return zoneData.offsets[getOffsetIndex(zoneData, timestamp)];
}

function getOffsetMinutesFromIntl(timeZone, timestamp) {
  const parts = getOffsetFormatter(timeZone).formatToParts(new Date(timestamp));
  const offsetPart = parts.find(function(part) {
    return part.type === "timeZoneName";
  });
  if (!offsetPart) {
    return 0;
  }
  return parseOffsetMinutes(offsetPart.value);
}

function getOffsetMinutes(timeZoneLike, timestamp) {
  return typeof timeZoneLike === "string" ?
    getOffsetMinutesFromIntl(timeZoneLike, timestamp) :
    getOffsetMinutesFromData(timeZoneLike, timestamp);
}

function toLocal(timeZoneLike, timestamp) {
  const offsetMinutes = getOffsetMinutes(timeZoneLike, timestamp);
  return {
    localTimestamp: timestamp - offsetMinutes * 60000,
    offsetMinutes
  };
}

function toUtc(timeZoneLike, localTimestamp, hintOffsetMinutes) {
  if (typeof timeZoneLike === "string") {
    return toUtcWithIntl(timeZoneLike, localTimestamp, hintOffsetMinutes);
  }

  let offsetMinutes = typeof hintOffsetMinutes === "number" ? hintOffsetMinutes : getOffsetMinutes(timeZoneLike, localTimestamp);
  let utcTimestamp = localTimestamp + offsetMinutes * 60000;
  let previous;

  for (let i = 0; i < 8; i++) {
    const nextOffset = getOffsetMinutes(timeZoneLike, utcTimestamp);
    const candidate = localTimestamp + nextOffset * 60000;

    if (Math.abs(candidate - utcTimestamp) < 1) {
      return candidate;
    }

    if (previous !== undefined && Math.abs(candidate - previous) < 1) {
      return Math.max(candidate, utcTimestamp);
    }

    previous = utcTimestamp;
    utcTimestamp = candidate;
  }

  return utcTimestamp;
}

function toUtcWithIntl(timeZone, localTimestamp, hintOffsetMinutes) {
  const localDate = new Date(localTimestamp);
  const baseUtc = Date.UTC(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth(),
    localDate.getUTCDate(),
    localDate.getUTCHours(),
    localDate.getUTCMinutes(),
    localDate.getUTCSeconds(),
    localDate.getUTCMilliseconds()
  );

  let offsetMinutes = typeof hintOffsetMinutes === "number" ? hintOffsetMinutes : getOffsetMinutesFromIntl(timeZone, baseUtc);
  let utcTimestamp = baseUtc + offsetMinutes * 60000;
  let previous;

  for (let i = 0; i < 8; i++) {
    const nextOffset = getOffsetMinutesFromIntl(timeZone, utcTimestamp);
    const candidate = baseUtc + nextOffset * 60000;

    if (Math.abs(candidate - utcTimestamp) < 1) {
      return candidate;
    }

    if (previous !== undefined && Math.abs(candidate - previous) < 1) {
      return Math.max(candidate, utcTimestamp);
    }

    previous = utcTimestamp;
    utcTimestamp = candidate;
  }

  return utcTimestamp;
}

class LegacyZonedDateTime {
  constructor(date, timeZoneLike) {
    this.timeZoneLike = timeZoneLike;
    this.utcTimestamp = date.getTime();
  }

  clone() {
    return new LegacyZonedDateTime(new Date(this.utcTimestamp), this.timeZoneLike);
  }

  valueOf() {
    return this.getTime();
  }

  getTime() {
    return this.utcTimestamp;
  }

  _getLocalDate() {
    const {localTimestamp, offsetMinutes} = toLocal(this.timeZoneLike, this.utcTimestamp);
    return {
      date: new Date(localTimestamp),
      offsetMinutes
    };
  }

  _setFromLocalDate(localDate, offsetMinutes) {
    this.utcTimestamp = toUtc(this.timeZoneLike, localDate.getTime(), offsetMinutes);
    return this.utcTimestamp;
  }

  getFullYear() {
    return this._getLocalDate().date.getUTCFullYear();
  }

  getMonth() {
    return this._getLocalDate().date.getUTCMonth();
  }

  getDate() {
    return this._getLocalDate().date.getUTCDate();
  }

  getHours() {
    return this._getLocalDate().date.getUTCHours();
  }

  getMinutes() {
    return this._getLocalDate().date.getUTCMinutes();
  }

  getSeconds() {
    return this._getLocalDate().date.getUTCSeconds();
  }

  getMilliseconds() {
    return this._getLocalDate().date.getUTCMilliseconds();
  }

  setMonth(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCMonth(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }

  setDate(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCDate(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }

  setHours(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCHours(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }

  setMinutes(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCMinutes(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }

  setSeconds(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCSeconds(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }

  setMilliseconds(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCMilliseconds(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }
}

class TemporalZonedDateTimeAdapter {
  constructor(zonedDateTime) {
    this.zonedDateTime = zonedDateTime;
  }

  clone() {
    return new TemporalZonedDateTimeAdapter(this.zonedDateTime);
  }

  valueOf() {
    return this.getTime();
  }

  getTime() {
    return Number(this.zonedDateTime.epochMilliseconds);
  }

  getFullYear() {
    return this.zonedDateTime.year;
  }

  getMonth() {
    return this.zonedDateTime.month - 1;
  }

  getDate() {
    return this.zonedDateTime.day;
  }

  getHours() {
    return this.zonedDateTime.hour;
  }

  getMinutes() {
    return this.zonedDateTime.minute;
  }

  getSeconds() {
    return this.zonedDateTime.second;
  }

  getMilliseconds() {
    return this.zonedDateTime.millisecond;
  }

  setMonth(value) {
    this.zonedDateTime = this.zonedDateTime.with({month: value + 1});
    return this.getTime();
  }

  setDate(value) {
    this.zonedDateTime = this.zonedDateTime.with({day: value});
    return this.getTime();
  }

  setHours(value) {
    this.zonedDateTime = this.zonedDateTime.with({hour: value});
    return this.getTime();
  }

  setMinutes(value) {
    this.zonedDateTime = this.zonedDateTime.with({minute: value});
    return this.getTime();
  }

  setSeconds(value) {
    this.zonedDateTime = this.zonedDateTime.with({second: value});
    return this.getTime();
  }

  setMilliseconds(value) {
    this.zonedDateTime = this.zonedDateTime.with({millisecond: value, microsecond: 0, nanosecond: 0});
    return this.getTime();
  }
}

function createZonedDateTimeAdapter(date, timeZoneLike) {
  var Temporal = getTemporal();

  if (Temporal) {
    if (isTemporalZonedDateTime(date)) {
      var zonedTimeZone = date.timeZone;
      if (timeZoneLike === undefined || timeZoneLike === null || timeZoneLike === zonedTimeZone) {
        return new TemporalZonedDateTimeAdapter(date);
      }
    }

    var hasTemporalInstant = Temporal.Instant && typeof Temporal.Instant.fromEpochMilliseconds === "function";

    if (hasTemporalInstant && isTemporalTimeZoneLike(timeZoneLike)) {
      try {
        var instant = Temporal.Instant.fromEpochMilliseconds(toEpochMilliseconds(date));
        return new TemporalZonedDateTimeAdapter(instant.toZonedDateTimeISO(timeZoneLike));
      } catch (error) {
        // Fall back to the legacy implementation below when Temporal cannot interpret the input.
      }
    }
  }

  return new LegacyZonedDateTime(toDate(date), timeZoneLike);
}

function isTemporalTimeZoneLike(value) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return true;
  }

  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return true;
  }

  var Temporal = getTemporal();
  return Boolean(Temporal && typeof Temporal.TimeZone === "function" && value instanceof Temporal.TimeZone);
}

const second = 1e3;
const minute = 6e4;
const hour = 36e5;
const day = 864e5;
// const week = 6048e5;
// const month = 2592e6;

function defineCachedGetter(obj, prop, get) {
  defineGetter(obj, prop, function() {
    if (!this._[prop]) {
      this._[prop] = get.call(this);
    }
    return this._[prop];
  });
}

function defineGetter(obj, prop, get) {
  Object.defineProperty(obj, prop, {get});
}

function startOf(date, unit) {
  const clone = typeof date.clone === "function" ? date.clone() : new Date(date.getTime());
  switch (unit) {
    case "year": clone.setMonth(0);
    // falls through
    case "month": clone.setDate(1);
    // falls through
    case "day": clone.setHours(0);
    // falls through
    case "hour": clone.setMinutes(0);
    // falls through
    case "minute": clone.setSeconds(0);
    // falls through
    case "second": clone.setMilliseconds(0);
  }
  return clone;
}

export default class RelativeTime {
  constructor() {
    this.formatters = RelativeTime.initializeFormatters(...arguments);
  }

  format(date, {timeZoneData = null, unit = "best-fit"} = {}) {
    var formatters = this.formatters;
    var zoneLike = timeZoneData;
    if ((zoneLike === undefined || zoneLike === null) && isTemporalZonedDateTime(date)) {
      var inferredTimeZone = date.timeZone;
      if (inferredTimeZone !== undefined && inferredTimeZone !== null) {
        zoneLike = typeof inferredTimeZone === "object" && inferredTimeZone !== null && "id" in inferredTimeZone ?
          inferredTimeZone.id :
          inferredTimeZone;
      }
    }

    var now = new Date();
    var target = zoneLike !== undefined && zoneLike !== null ? createZonedDateTimeAdapter(date, zoneLike) : toDate(date);

    if (zoneLike !== undefined && zoneLike !== null) {
      now = createZonedDateTimeAdapter(now, zoneLike);
    }

    var diff = {
      _: {},
      ms: target.getTime() - now.getTime(),
      years: target.getFullYear() - now.getFullYear()
    };
    var round = Math[diff.ms > 0 ? "floor" : "ceil"];

    defineCachedGetter(diff, "months", function() {
      return this.years * 12 + target.getMonth() - now.getMonth();
    });
    defineCachedGetter(diff, "days", function() {
      return round((startOf(target, "day") - startOf(now, "day")) / day);
    });
    defineCachedGetter(diff, "hours", function() {
      return round((startOf(target, "hour") - startOf(now, "hour")) / hour);
    });
    defineCachedGetter(diff, "minutes", function() {
      return round((startOf(target, "minute") - startOf(now, "minute")) / minute);
    });
    defineCachedGetter(diff, "seconds", function() {
      return round((startOf(target, "second") - startOf(now, "second")) / second);
    });

    var absDiff = {
      _: {}
    };

    defineGetter(absDiff, "years", function() {
      return Math.abs(diff.years);
    });
    defineGetter(absDiff, "months", function() {
      return Math.abs(diff.months);
    });
    defineGetter(absDiff, "days", function() {
      return Math.abs(diff.days);
    });
    defineGetter(absDiff, "hours", function() {
      return Math.abs(diff.hours);
    });
    defineGetter(absDiff, "minutes", function() {
      return Math.abs(diff.minutes);
    });
    defineGetter(absDiff, "seconds", function() {
      return Math.abs(diff.seconds);
    });

    if (unit === "best-fit") {
      unit = RelativeTime.bestFit(absDiff);
    }

    switch(unit) {
      case "year": return formatters.year(diff.years);
      case "month": return formatters.month(diff.months);
      // case "week": return formatters.week(diff.weeks);
      case "day": return formatters.day(diff.days);
      case "hour": return formatters.hour(diff.hours);
      case "minute": return formatters.minute(diff.minutes);
      default: return formatters.second(diff.seconds);
    }
  }
}

RelativeTime.bestFit = function(absDiff) {
  let threshold = this.threshold;
  switch(true) {
    case absDiff.years > 0 && absDiff.months > threshold.month: return "year";
    case absDiff.months > 0 && absDiff.days > threshold.day: return "month";
    // case absDiff.months > 0 && absDiff.weeks > threshold.week: return "month";
    // case absDiff.weeks > 0 && absDiff.days > threshold.day: return "week";
    case absDiff.days > 0 && absDiff.hours > threshold.hour: return "day";
    case absDiff.hours > 0 && absDiff.minutes > threshold.minute: return "hour";
    case absDiff.minutes > 0 && absDiff.seconds > threshold.second: return "minute";
    default: return "second";
  }
};

RelativeTime.threshold = {
  month: 2, // at least 2 months before using year.
  // week: 4, // at least 4 weeks before using month.
  day: 6, // at least 6 days before using month.
  hour: 6, // at least 6 hours before using day.
  minute: 59, // at least 59 minutes before using hour.
  second: 59 // at least 59 seconds before using minute.
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
