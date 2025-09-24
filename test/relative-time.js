import RelativeTime from "../src/relative-time";

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

function normalizeTimeZone(zoneLike) {
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

class FakeTemporalInstant {
  constructor(epochMilliseconds) {
    this.epochMilliseconds = epochMilliseconds;
  }

  static from(isoString) {
    return new FakeTemporalInstant(Date.parse(isoString));
  }

  static fromEpochMilliseconds(epochMilliseconds) {
    return new FakeTemporalInstant(epochMilliseconds);
  }

  toZonedDateTimeISO(timeZoneLike) {
    return FakeTemporalZonedDateTime.fromInstant(this, timeZoneLike);
  }
}

class FakeTemporalZonedDateTime {
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

var TemporalPolyfill = {
  Instant: FakeTemporalInstant,
  ZonedDateTime: FakeTemporalZonedDateTime,
  Now: {
    instant: function() {
      return new FakeTemporalInstant(Date.now());
    },
    zonedDateTimeISO: function(timeZoneLike) {
      var zone = normalizeTimeZone(timeZoneLike) || "UTC";
      return FakeTemporalZonedDateTime.fromInstant(this.instant(), zone);
    }
  }
};

function toIsoUtc(dateTime) {
  if (dateTime.includes("[")) {
    return dateTime;
  }
  var parts = dateTime.split(" ");
  var date = parts[0];
  var time = parts[1] ? parts[1] : "00:00:00";
  var segments = time.split(":").map(function(segment) {
    return segment.trim();
  });
  while (segments.length < 3) {
    segments.push("00");
  }
  return date + "T" +
    segments[0].padStart(2, "0") + ":" +
    segments[1].padStart(2, "0") + ":" +
    segments[2].padStart(2, "0") +
    "+00:00[UTC]";
}

function zoned(dateTime) {
  return global.Temporal.ZonedDateTime.from(toIsoUtc(dateTime));
}

describe("relative-time", function() {
  var relativeTime;
  var originalTemporal;
  var baseNow;

  before(function() {
    originalTemporal = global.Temporal;
    global.Temporal = TemporalPolyfill;
  });

  after(function() {
    global.Temporal = originalTemporal;
  });

  beforeEach(function() {
    relativeTime = new RelativeTime();
    baseNow = zoned("2016-04-10 12:00:00");
  });

  describe("bestFit", function() {
    it("should format seconds-distant dates", function() {
      expect(relativeTime.format(zoned("2016-04-10 11:59:01"), {now: baseNow})).to.equal("59 seconds ago");
      expect(relativeTime.format(zoned("2016-04-10 12:00:00"), {now: baseNow})).to.equal("now");
      expect(relativeTime.format(zoned("2016-04-10 12:00:59"), {now: baseNow})).to.equal("in 59 seconds");
    });

    it("should format minutes-distant dates", function() {
      expect(relativeTime.format(zoned("2016-04-10 11:01:00"), {now: baseNow})).to.equal("59 minutes ago");
      expect(relativeTime.format(zoned("2016-04-10 11:59:00"), {now: baseNow})).to.equal("1 minute ago");
      expect(relativeTime.format(zoned("2016-04-10 12:01:00"), {now: baseNow})).to.equal("in 1 minute");
      expect(relativeTime.format(zoned("2016-04-10 12:01:59"), {now: baseNow})).to.equal("in 1 minute");
      expect(relativeTime.format(zoned("2016-04-10 12:59:59"), {now: baseNow})).to.equal("in 59 minutes");
    });

    it("should format hours-distant dates", function() {
      expect(relativeTime.format(zoned("2016-04-10 00:00:00"), {now: baseNow})).to.equal("12 hours ago");
      expect(relativeTime.format(zoned("2016-04-10 13:00:00"), {now: baseNow})).to.equal("in 1 hour");
      expect(relativeTime.format(zoned("2016-04-10 13:59:59"), {now: baseNow})).to.equal("in 1 hour");
      expect(relativeTime.format(zoned("2016-04-10 23:59:59"), {now: baseNow})).to.equal("in 11 hours");

      var eveningNow = zoned("2016-04-10 01:00:00");
      expect(relativeTime.format(zoned("2016-04-09 19:00:00"), {now: eveningNow})).to.equal("6 hours ago");
      expect(relativeTime.format(zoned("2016-04-09 18:00:00"), {now: eveningNow})).to.equal("yesterday");

      var lateNow = zoned("2016-04-10 23:00:00");
      expect(relativeTime.format(zoned("2016-04-11 05:00:00"), {now: lateNow})).to.equal("in 6 hours");
      expect(relativeTime.format(zoned("2016-04-11 06:00:00"), {now: lateNow})).to.equal("tomorrow");

      var janEnd = zoned("2016-01-31 23:00:00");
      expect(relativeTime.format(zoned("2016-02-01 05:00:00"), {now: janEnd})).to.equal("in 6 hours");
      expect(relativeTime.format(zoned("2016-02-01 07:00:00"), {now: janEnd})).to.equal("tomorrow");

      var yearEnd = zoned("2016-12-31 23:00:00");
      expect(relativeTime.format(zoned("2017-01-01 05:00:00"), {now: yearEnd})).to.equal("in 6 hours");
      expect(relativeTime.format(zoned("2017-01-01 07:00:00"), {now: yearEnd})).to.equal("tomorrow");
    });

    it("should format days-distant dates", function() {
      expect(relativeTime.format(zoned("2016-04-01 00:00:00"), {now: baseNow})).to.equal("9 days ago");
      expect(relativeTime.format(zoned("2016-04-09 18:00:00"), {now: baseNow})).to.equal("yesterday");
      expect(relativeTime.format(zoned("2016-04-11 09:00:00"), {now: baseNow})).to.equal("tomorrow");
      expect(relativeTime.format(zoned("2016-04-30 23:59:00"), {now: baseNow})).to.equal("in 20 days");
      expect(relativeTime.format(zoned("2016-03-31 23:59:00"), {now: baseNow})).to.equal("last month");
      expect(relativeTime.format(zoned("2016-05-01 00:00:00"), {now: baseNow})).to.equal("next month");

      var aprilSixth = zoned("2016-04-06 12:00:00");
      expect(relativeTime.format(zoned("2016-03-31 23:59:00"), {now: aprilSixth})).to.equal("6 days ago");

      var aprilTwentyFifth = zoned("2016-04-25 23:00:00");
      expect(relativeTime.format(zoned("2016-05-01 00:00:00"), {now: aprilTwentyFifth})).to.equal("in 6 days");
    });

    it("should format months-distant dates", function() {
      expect(relativeTime.format(zoned("2016-01-01 00:00:00"), {now: baseNow})).to.equal("3 months ago");
      expect(relativeTime.format(zoned("2016-03-01 00:00:00"), {now: baseNow})).to.equal("last month");
      expect(relativeTime.format(zoned("2016-05-01 00:00:00"), {now: baseNow})).to.equal("next month");
      expect(relativeTime.format(zoned("2016-12-01 23:59:00"), {now: baseNow})).to.equal("in 8 months");

      var janTwelve = zoned("2017-01-12 18:30:00");
      expect(relativeTime.format(zoned("2016-12-29 18:30:00"), {now: janTwelve})).to.equal("last month");

      var decTwentyNine = zoned("2016-12-29 18:30:00");
      expect(relativeTime.format(zoned("2017-01-12 18:30:00"), {now: decTwentyNine})).to.equal("next month");

      var febTwentyEight = zoned("2016-02-28 12:00:00");
      expect(relativeTime.format(zoned("2015-12-31 23:59:00"), {now: febTwentyEight})).to.equal("2 months ago");
    });

    it("should format years-distant dates", function() {
      expect(relativeTime.format(zoned("2010-06-01 12:00:00"), {now: baseNow})).to.equal("6 years ago");
      expect(relativeTime.format(zoned("2015-12-31 23:59:00"), {now: baseNow})).to.equal("last year");
      expect(relativeTime.format(zoned("2017-01-01 00:00:00"), {now: baseNow})).to.equal("next year");

      var octSecond = zoned("2016-10-02 12:00:00");
      expect(relativeTime.format(zoned("2017-01-01 00:00:00"), {now: octSecond})).to.equal("next year");
    });

    it("should format relative time using hours", function() {
      expect(relativeTime.format(zoned("2016-04-10 12:45:00"), {unit: "hour", now: baseNow})).to.equal("this hour");
      expect(relativeTime.format(zoned("2016-04-10 11:01:00"), {unit: "hour", now: baseNow})).to.equal("1 hour ago");
      expect(relativeTime.format(zoned("2016-04-10 00:00:00"), {unit: "hour", now: baseNow})).to.equal("12 hours ago");
      expect(relativeTime.format(zoned("2016-04-01 00:00:00"), {unit: "hour", now: baseNow})).to.equal("228 hours ago");
      expect(relativeTime.format(zoned("2016-01-01 00:00:00"), {unit: "hour", now: baseNow})).to.equal("2,412 hours ago");
    });

    it("should format relative time using days", function() {
      expect(relativeTime.format(zoned("2016-04-10 11:30:00"), {unit: "day", now: baseNow})).to.equal("today");
      expect(relativeTime.format(zoned("2016-01-01 00:00:00"), {unit: "day", now: baseNow})).to.equal("100 days ago");
    });

    it("should format relative time using months", function() {
      expect(relativeTime.format(zoned("2016-04-10 23:59:59"), {unit: "month", now: baseNow})).to.equal("this month");
      expect(relativeTime.format(zoned("2017-01-01 00:00:00"), {unit: "month", now: baseNow})).to.equal("in 9 months");
    });
  });

  describe("time zone", function() {
    beforeEach(function() {
      baseNow = zoned("2016-04-10T12:00:00Z[UTC]");
    });

    it("should support using specific time zone", function() {
      var losAngelesDate = zoned("2016-04-09T17:00:00-07:00[America/Los_Angeles]");
      expect(relativeTime.format(losAngelesDate, {now: baseNow})).to.equal("yesterday");

      var berlinDate = zoned("2016-04-10T02:00:00+02:00[Europe/Berlin]");
      expect(relativeTime.format(berlinDate, {now: baseNow})).to.equal("12 hours ago");

      var losAngelesMarchDate = zoned("2016-03-31T17:00:00-07:00[America/Los_Angeles]");
      expect(relativeTime.format(losAngelesMarchDate, {now: baseNow})).to.equal("last month");

      var berlinAprilDate = zoned("2016-04-01T02:00:00+02:00[Europe/Berlin]");
      expect(relativeTime.format(berlinAprilDate, {now: baseNow})).to.equal("9 days ago");

      var losAngelesYearDate = zoned("2015-12-31T16:00:00-08:00[America/Los_Angeles]");
      expect(relativeTime.format(losAngelesYearDate, {now: baseNow})).to.equal("last year");

      var berlinYearDate = zoned("2016-01-01T01:00:00+01:00[Europe/Berlin]");
      expect(relativeTime.format(berlinYearDate, {now: baseNow})).to.equal("3 months ago");
    });

    it("should format daylight savings edge cases", function() {
      baseNow = zoned("2017-03-12T10:00:00Z[UTC]");
      var dstDate = zoned("2017-03-12T01:00:00-08:00[America/Los_Angeles]");
      expect(relativeTime.format(dstDate, {now: baseNow})).to.equal("1 hour ago");
    });
  });

  describe("Temporal inputs", function() {
    it("should accept Temporal.Instant values", function() {
      var instant = global.Temporal.Instant.from("2016-04-10T11:59:01Z");
      expect(relativeTime.format(instant, {now: baseNow})).to.equal("59 seconds ago");
    });

    it("should use Temporal.Now when now is omitted", function() {
      var instantNow = zoned("2016-04-10 12:00:00");
      var originalInstant = global.Temporal.Now.instant;
      var originalZoned = global.Temporal.Now.zonedDateTimeISO;

      global.Temporal.Now.instant = function() {
        return new FakeTemporalInstant(instantNow.getTime());
      };
      global.Temporal.Now.zonedDateTimeISO = function(timeZoneLike) {
        var zone = normalizeTimeZone(timeZoneLike) || "UTC";
        return FakeTemporalZonedDateTime.fromInstant(global.Temporal.Now.instant(), zone);
      };

      try {
        expect(relativeTime.format(zoned("2016-04-10 11:59:01"))).to.equal("59 seconds ago");
      } finally {
        global.Temporal.Now.instant = originalInstant;
        global.Temporal.Now.zonedDateTimeISO = originalZoned;
      }
    });
  });
});
