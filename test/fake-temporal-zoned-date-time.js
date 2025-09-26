const offsetFormatters = new Map();
const dateTimeFormatters = new Map();
const second = 1e3;
const minute = 6e4;
const hour = 36e5;
const day = 864e5;

function getOffsetFormatter(timeZone) {
  var formatter = offsetFormatters.get(timeZone);
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
  var match = value.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return 0;
  }
  var sign = match[1] === "-" ? -1 : 1;
  var hours = parseInt(match[2], 10);
  var minutes = match[3] ? parseInt(match[3], 10) : 0;
  return -sign * (hours * 60 + minutes);
}

function getOffsetMinutesFromIntl(timeZone, timestamp) {
  var parts = getOffsetFormatter(timeZone).formatToParts(new Date(timestamp));
  var offsetPart = parts.find(function(part) {
    return part.type === "timeZoneName";
  });
  if (!offsetPart) {
    return 0;
  }
  return parseOffsetMinutes(offsetPart.value);
}

function getDateTimeFormatter(timeZone) {
  var formatter = dateTimeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    dateTimeFormatters.set(timeZone, formatter);
  }
  return formatter;
}

function getLocalFields(epochMilliseconds, timeZone) {
  var parts = getDateTimeFormatter(timeZone).formatToParts(new Date(epochMilliseconds));
  var values = {};
  parts.forEach(function(part) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });
  var millisecond = ((epochMilliseconds % 1000) + 1000) % 1000;
  return {
    year: parseInt(values.year, 10),
    month: parseInt(values.month, 10),
    day: parseInt(values.day, 10),
    hour: parseInt(values.hour, 10),
    minute: parseInt(values.minute, 10),
    second: parseInt(values.second, 10),
    millisecond
  };
}

function createIsoLocalTimestamp(fields) {
  return Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second,
    fields.millisecond
  );
}

function toLocal(timeZone, timestamp) {
  var offsetMinutes = getOffsetMinutesFromIntl(timeZone, timestamp);
  return {
    localTimestamp: timestamp - offsetMinutes * 60000,
    offsetMinutes
  };
}

function toUtc(timeZone, localTimestamp, hintOffsetMinutes) {
  return toUtcWithIntl(timeZone, localTimestamp, hintOffsetMinutes);
}

function toUtcWithIntl(timeZone, localTimestamp, hintOffsetMinutes) {
  var localDate = new Date(localTimestamp);
  var baseUtc = Date.UTC(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth(),
    localDate.getUTCDate(),
    localDate.getUTCHours(),
    localDate.getUTCMinutes(),
    localDate.getUTCSeconds(),
    localDate.getUTCMilliseconds()
  );

  var offsetMinutes = typeof hintOffsetMinutes === "number" ? hintOffsetMinutes : getOffsetMinutesFromIntl(timeZone, baseUtc);
  var utcTimestamp = baseUtc + offsetMinutes * 60000;
  var previous;

  for (var i = 0; i < 8; i++) {
    var nextOffset = getOffsetMinutesFromIntl(timeZone, utcTimestamp);
    var candidate = baseUtc + nextOffset * 60000;

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

export function normalizeTimeZone(zoneLike) {
  if (zoneLike === undefined || zoneLike === null) {
    return zoneLike;
  }
  if (typeof zoneLike === "string") {
    return zoneLike;
  }
  if (typeof zoneLike === "object" && typeof zoneLike.id === "string") {
    return zoneLike.id;
  }
  throw new TypeError("Unsupported time zone");
}

function computeDiff(start, end) {
  var diff = {
    ms: end.getTime() - start.getTime(),
    years: end.year - start.year
  };
  var round = diff.ms > 0 ? Math.floor : Math.ceil;

  diff.months = diff.years * 12 + end.month - start.month;
  diff.days = round((startOf(end, "day").getTime() - startOf(start, "day").getTime()) / day);
  diff.hours = round((startOf(end, "hour").getTime() - startOf(start, "hour").getTime()) / hour);
  diff.minutes = round((startOf(end, "minute").getTime() - startOf(start, "minute").getTime()) / minute);
  diff.seconds = round((startOf(end, "second").getTime() - startOf(start, "second").getTime()) / second);
  return diff;
}

function startOf(date, unit) {
  var clone = date.clone();
  switch (unit) {
    case "year": clone.setMonth(0);
    /* falls through */
    case "month": clone.setDate(1);
    /* falls through */
    case "day": clone.setHours(0);
    /* falls through */
    case "hour": clone.setMinutes(0);
    /* falls through */
    case "minute": clone.setSeconds(0);
    /* falls through */
    case "second": clone.setMilliseconds(0);
  }
  return clone;
}

export default class FakeTemporalZonedDateTime {
  constructor(epochMilliseconds, timeZone) {
    this.epochMilliseconds = epochMilliseconds;
    this.timeZone = normalizeTimeZone(timeZone);
  }

  static from(isoString) {
    var match = isoString.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?((?:[+-]\d{2}:\d{2})|Z)\[(.+)\]$/);
    if (!match) {
      throw new Error("Unsupported ISO string: " + isoString);
    }
    var dateTime = match[1];
    var fractional = match[2] ? match[2] : "000";
    var offset = match[3] === "Z" ? "+00:00" : match[3];
    var timeZone = match[4];
    var epochMilliseconds = Date.parse(dateTime + "." + fractional.padEnd(3, "0") + offset);
    return new FakeTemporalZonedDateTime(epochMilliseconds, timeZone);
  }

  static fromInstant(instant, timeZoneLike) {
    return new FakeTemporalZonedDateTime(instant.epochMilliseconds, normalizeTimeZone(timeZoneLike));
  }

  clone() {
    return new FakeTemporalZonedDateTime(this.epochMilliseconds, this.timeZone);
  }

  getTime() {
    return this.epochMilliseconds;
  }

  withTimeZone(timeZoneLike) {
    return new FakeTemporalZonedDateTime(this.epochMilliseconds, normalizeTimeZone(timeZoneLike));
  }

  with(changes) {
    var fields = getLocalFields(this.epochMilliseconds, this.timeZone);
    var next = {
      year: fields.year,
      month: fields.month,
      day: fields.day,
      hour: fields.hour,
      minute: fields.minute,
      second: fields.second,
      millisecond: fields.millisecond
    };

    if (changes.year !== undefined) {
      next.year = changes.year;
    }
    if (changes.month !== undefined) {
      next.month = changes.month;
    }
    if (changes.day !== undefined) {
      next.day = changes.day;
    }
    if (changes.hour !== undefined) {
      next.hour = changes.hour;
    }
    if (changes.minute !== undefined) {
      next.minute = changes.minute;
    }
    if (changes.second !== undefined) {
      next.second = changes.second;
    }
    if (changes.millisecond !== undefined) {
      next.millisecond = changes.millisecond;
    }

    var hintOffset = getOffsetMinutesFromIntl(this.timeZone, this.epochMilliseconds);
    var localTimestamp = createIsoLocalTimestamp(next);
    var epochMilliseconds = toUtc(this.timeZone, localTimestamp, hintOffset);
    return new FakeTemporalZonedDateTime(epochMilliseconds, this.timeZone);
  }

  get year() {
    return getLocalFields(this.epochMilliseconds, this.timeZone).year;
  }

  get month() {
    return getLocalFields(this.epochMilliseconds, this.timeZone).month;
  }

  get day() {
    return getLocalFields(this.epochMilliseconds, this.timeZone).day;
  }

  get hour() {
    return getLocalFields(this.epochMilliseconds, this.timeZone).hour;
  }

  get minute() {
    return getLocalFields(this.epochMilliseconds, this.timeZone).minute;
  }

  get second() {
    return getLocalFields(this.epochMilliseconds, this.timeZone).second;
  }

  get millisecond() {
    return getLocalFields(this.epochMilliseconds, this.timeZone).millisecond;
  }

  _getLocalDate() {
    var result = toLocal(this.timeZone, this.epochMilliseconds);
    return {
      date: new Date(result.localTimestamp),
      offsetMinutes: result.offsetMinutes
    };
  }

  _setFromLocalDate(localDate, offsetMinutes) {
    this.epochMilliseconds = toUtc(this.timeZone, localDate.getTime(), offsetMinutes);
    return this.epochMilliseconds;
  }

  setMonth(value) {
    var result = this._getLocalDate();
    result.date.setUTCMonth(value);
    return this._setFromLocalDate(result.date, result.offsetMinutes);
  }

  setDate(value) {
    var result = this._getLocalDate();
    result.date.setUTCDate(value);
    return this._setFromLocalDate(result.date, result.offsetMinutes);
  }

  setHours(value) {
    var result = this._getLocalDate();
    result.date.setUTCHours(value);
    return this._setFromLocalDate(result.date, result.offsetMinutes);
  }

  setMinutes(value) {
    var result = this._getLocalDate();
    result.date.setUTCMinutes(value);
    return this._setFromLocalDate(result.date, result.offsetMinutes);
  }

  setSeconds(value) {
    var result = this._getLocalDate();
    result.date.setUTCSeconds(value);
    return this._setFromLocalDate(result.date, result.offsetMinutes);
  }

  setMilliseconds(value) {
    var result = this._getLocalDate();
    result.date.setUTCMilliseconds(value);
    return this._setFromLocalDate(result.date, result.offsetMinutes);
  }

  until(other) {
    var diff = computeDiff(this, other);
    return {
      years: diff.years,
      months: diff.months,
      days: diff.days,
      hours: diff.hours,
      minutes: diff.minutes,
      seconds: diff.seconds
    };
  }
}
