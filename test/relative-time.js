import RelativeTime from "../src/relative-time";
import sinon from "sinon";

const offsetFormatters = new Map();

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

const dateTimeFormatters = new Map();

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

class FakeTemporalZonedDateTime {
  constructor(epochMilliseconds, timeZone) {
    this.epochMilliseconds = epochMilliseconds;
    this.timeZone = timeZone;
  }

  static from(isoString) {
    var match = isoString.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?([+-]\d{2}:\d{2})\[(.+)\]$/);
    if (!match) {
      throw new Error("Unsupported ISO string: " + isoString);
    }
    var dateTime = match[1];
    var fractional = match[2] ? match[2] : "000";
    var offset = match[3];
    var timeZone = match[4];
    var epochMilliseconds = Date.parse(dateTime + "." + fractional.padEnd(3, "0") + offset);
    return new FakeTemporalZonedDateTime(epochMilliseconds, timeZone);
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
    var epochMilliseconds = toUtcWithIntl(this.timeZone, localTimestamp, hintOffset);
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
}

var TemporalPolyfill = {
  ZonedDateTime: FakeTemporalZonedDateTime
};

describe("relative-time", function() {
  var clock, relativeTime, originalTemporal;

  before(function() {
    originalTemporal = global.Temporal;
    global.Temporal = TemporalPolyfill;
    relativeTime = new RelativeTime();
  });

  after(function() {
    global.Temporal = originalTemporal;
  });

  describe("bestFit", function() {
    beforeEach(function() {
      clock = sinon.useFakeTimers(new Date("2016-04-10 12:00:00").getTime());
    });

    afterEach(function() {
      clock.restore();
    });

    it("should format seconds-distant dates", function() {
      expect(relativeTime.format(new Date("2016-04-10 11:59:01"))).to.equal("59 seconds ago");
      expect(relativeTime.format(new Date("2016-04-10 12:00:00"))).to.equal("now");
      expect(relativeTime.format(new Date("2016-04-10 12:00:59"))).to.equal("in 59 seconds");
    });

    it("should format minutes-distant dates", function() {
      expect(relativeTime.format(new Date("2016-04-10 11:01:00"))).to.equal("59 minutes ago");
      expect(relativeTime.format(new Date("2016-04-10 11:59"))).to.equal("1 minute ago");
      expect(relativeTime.format(new Date("2016-04-10 12:01"))).to.equal("in 1 minute");
      expect(relativeTime.format(new Date("2016-04-10 12:01:59"))).to.equal("in 1 minute");
      expect(relativeTime.format(new Date("2016-04-10 12:59:59"))).to.equal("in 59 minutes");
    });

    it("should format hours-distant dates", function() {
      expect(relativeTime.format(new Date("2016-04-10 00:00"))).to.equal("12 hours ago");
      expect(relativeTime.format(new Date("2016-04-10 13:00"))).to.equal("in 1 hour");
      expect(relativeTime.format(new Date("2016-04-10 13:59:59"))).to.equal("in 1 hour");
      expect(relativeTime.format(new Date("2016-04-10 23:59:59"))).to.equal("in 11 hours");

      sinon.useFakeTimers(new Date("2016-04-10 01:00").getTime());
      expect(relativeTime.format(new Date("2016-04-09 19:00"))).to.equal("6 hours ago");
      expect(relativeTime.format(new Date("2016-04-09 18:00"))).to.equal("yesterday");

      sinon.useFakeTimers(new Date("2016-04-10 23:00").getTime());
      expect(relativeTime.format(new Date("2016-04-11 05:00"))).to.equal("in 6 hours");
      expect(relativeTime.format(new Date("2016-04-11 06:00"))).to.equal("tomorrow");

      sinon.useFakeTimers(new Date("2016-01-31 23:00").getTime());
      expect(relativeTime.format(new Date("2016-02-01 05:00"))).to.equal("in 6 hours");
      expect(relativeTime.format(new Date("2016-02-01 07:00"))).to.equal("tomorrow");

      sinon.useFakeTimers(new Date("2016-12-31 23:00").getTime());
      expect(relativeTime.format(new Date("2017-01-01 05:00"))).to.equal("in 6 hours");
      expect(relativeTime.format(new Date("2017-01-01 07:00"))).to.equal("tomorrow");
    });

    it("should format days-distant dates", function() {
      expect(relativeTime.format(new Date("2016-04-01 00:00"))).to.equal("9 days ago");
      expect(relativeTime.format(new Date("2016-04-09 18:00"))).to.equal("yesterday");
      expect(relativeTime.format(new Date("2016-04-11 09:00"))).to.equal("tomorrow");
      expect(relativeTime.format(new Date("2016-04-30 23:59"))).to.equal("in 20 days");
      expect(relativeTime.format(new Date("2016-03-31 23:59"))).to.equal("last month");
      expect(relativeTime.format(new Date("2016-05-01 00:00"))).to.equal("next month");

      sinon.useFakeTimers(new Date("2016-04-06 12:00").getTime());
      expect(relativeTime.format(new Date("2016-03-31 23:59"))).to.equal("6 days ago");

      sinon.useFakeTimers(new Date("2016-04-25 23:00").getTime());
      expect(relativeTime.format(new Date("2016-05-01 00:00"))).to.equal("in 6 days");
    });

    it("should format months-distant dates", function() {
      expect(relativeTime.format(new Date("2016-01-01 00:00"))).to.equal("3 months ago");
      expect(relativeTime.format(new Date("2016-03-01 00:00"))).to.equal("last month");
      expect(relativeTime.format(new Date("2016-05-01 00:00"))).to.equal("next month");
      expect(relativeTime.format(new Date("2016-12-01 23:59"))).to.equal("in 8 months");

      sinon.useFakeTimers(new Date("2017-01-12 18:30").getTime());
      expect(relativeTime.format(new Date("2016-12-29 18:30"))).to.equal("last month");

      sinon.useFakeTimers(new Date("2016-12-29 18:30").getTime());
      expect(relativeTime.format(new Date("2017-01-12 18:30"))).to.equal("next month");

      sinon.useFakeTimers(new Date("2016-02-28 12:00").getTime());
      expect(relativeTime.format(new Date("2015-12-31 23:59"))).to.equal("2 months ago");
    });

    it("should format years-distant dates", function() {
      expect(relativeTime.format(new Date("2010-06-01 12:00"))).to.equal("6 years ago");
      expect(relativeTime.format(new Date("2015-12-31 23:59"))).to.equal("last year");
      expect(relativeTime.format(new Date("2017-01-01 00:00"))).to.equal("next year");

      sinon.useFakeTimers(new Date("2016-10-02 12:00").getTime());
      expect(relativeTime.format(new Date("2017-01-01 00:00"))).to.equal("next year");
    });
  });

  describe("explicit units", function() {
    beforeEach(function() {
      clock = sinon.useFakeTimers(new Date("2016-04-10 12:00:00").getTime());
    });

    afterEach(function() {
      clock.restore();
    });

    it("shold format relative time using seconds", function() {
      expect(relativeTime.format(new Date("2016-04-10 11:59:01"), {unit: "second"})).to.equal("59 seconds ago");
      expect(relativeTime.format(new Date("2016-04-10 11:01:00"), {unit: "second"})).to.equal("3,540 seconds ago");
      expect(relativeTime.format(new Date("2016-04-10 00:00"), {unit: "second"})).to.equal("43,200 seconds ago");
    });

    it("shold format relative time using minutes", function() {
      expect(relativeTime.format(new Date("2016-04-10 12:00:47"), {unit: "minute"})).to.equal("this minute");
      expect(relativeTime.format(new Date("2016-04-10 11:59:45"), {unit: "minute"})).to.equal("1 minute ago");
      expect(relativeTime.format(new Date("2016-04-10 11:01:00"), {unit: "minute"})).to.equal("59 minutes ago");
      expect(relativeTime.format(new Date("2016-04-01 00:00"), {unit: "minute"})).to.equal("13,680 minutes ago");
    });

    it("shold format relative time using hours", function() {
      expect(relativeTime.format(new Date("2016-04-10 12:45:00"), {unit: "hour"})).to.equal("this hour");
      expect(relativeTime.format(new Date("2016-04-10 11:01:00"), {unit: "hour"})).to.equal("1 hour ago");
      expect(relativeTime.format(new Date("2016-04-10 00:00"), {unit: "hour"})).to.equal("12 hours ago");
      expect(relativeTime.format(new Date("2016-04-01 00:00"), {unit: "hour"})).to.equal("228 hours ago");
      expect(relativeTime.format(new Date("2016-01-01 00:00"), {unit: "hour"})).to.equal("2,412 hours ago");
    });

    it("shold format relative time using days", function() {
      expect(relativeTime.format(new Date("2016-04-10 11:30:00"), {unit: "day"})).to.equal("today");
      expect(relativeTime.format(new Date("2016-01-01 00:00"), {unit: "day"})).to.equal("100 days ago");
    });

    it("shold format relative time using months", function() {
      expect(relativeTime.format(new Date("2016-04-10 23:59:59"), {unit: "month"})).to.equal("this month");
      expect(relativeTime.format(new Date("2017-01-01 00:00"), {unit: "month"})).to.equal("in 9 months");
    });
  });

  describe("time zone", function() {
    beforeEach(function() {
      clock = sinon.useFakeTimers(new Date("2016-04-10T12:00:00Z").getTime());
    });

    afterEach(function() {
      clock.restore();
    });

    it("should support using specific time zone", function() {
      var Temporal = global.Temporal;

      // Target: 2016-04-09 17:00:00 GMT-7 (PDT)
      // Now: 2016-04-10 05:00:00 GMT-7 (PDT)
      var losAngelesDate = Temporal.ZonedDateTime.from(
        "2016-04-09T17:00:00-07:00[America/Los_Angeles]"
      );
      expect(relativeTime.format(losAngelesDate)).to.equal("yesterday");

      // Target: 2016-04-10 14:00:00 GMT+2 (Central European Summer Time)
      // Now: 2016-04-10 14:00:00 GMT+2 (Central European Summer Time)
      var berlinDate = Temporal.ZonedDateTime.from(
        "2016-04-10T02:00:00+02:00[Europe/Berlin]"
      );
      expect(relativeTime.format(berlinDate)).to.equal("12 hours ago");

      // Target: 2016-03-31 17:00:00 GMT-7 (PDT)
      // Now: 2016-04-10 05:00:00 GMT-7 (PDT)
      var losAngelesMarchDate = Temporal.ZonedDateTime.from(
        "2016-03-31T17:00:00-07:00[America/Los_Angeles]"
      );
      expect(relativeTime.format(losAngelesMarchDate)).to.equal("last month");

      // Target: 2016-04-01 02:00:00 GMT+2 (Central European Summer Time)
      // Now: 2016-04-10 14:00:00 GMT+2 (Central European Summer Time)
      var berlinAprilDate = Temporal.ZonedDateTime.from(
        "2016-04-01T02:00:00+02:00[Europe/Berlin]"
      );
      expect(relativeTime.format(berlinAprilDate)).to.equal("9 days ago");

      // Target: 2015-12-31 16:00:00 GMT-8 (PST)
      // Now: 2016-04-10 05:00:00 GMT-7 (PDT)
      var losAngelesYearDate = Temporal.ZonedDateTime.from(
        "2015-12-31T16:00:00-08:00[America/Los_Angeles]"
      );
      expect(relativeTime.format(losAngelesYearDate)).to.equal("last year");

      // Target: 2016-01-01 01:00:00 GMT+1 (Central European Standard Time)
      // Now: 2016-04-10 14:00:00 GMT+2 (Central European Summer Time)
      var berlinYearDate = Temporal.ZonedDateTime.from(
        "2016-01-01T01:00:00+01:00[Europe/Berlin]"
      );
      expect(relativeTime.format(berlinYearDate)).to.equal("3 months ago");
    });

    it("should infer time zone from Temporal zoned date time inputs", function() {
      function MinimalTemporalZonedDateTime(epochMilliseconds, timeZoneId) {
        this.epochMilliseconds = epochMilliseconds;
        this.timeZone = {id: timeZoneId};
      }

      var polyfillTemporal = global.Temporal;
      global.Temporal = {
        ZonedDateTime: MinimalTemporalZonedDateTime
      };

      try {
        var epoch = Date.parse("2016-04-10T00:00:00Z");

        // Target: 2016-04-09 17:00:00 GMT-7 (PDT)
        // Now: 2016-04-10 05:00:00 GMT-7 (PDT)
        var losAngelesDate = new MinimalTemporalZonedDateTime(epoch, "America/Los_Angeles");
        expect(relativeTime.format(losAngelesDate)).to.equal("yesterday");

        // Target: 2016-04-10 14:00:00 GMT+2 (Central European Summer Time)
        // Now: 2016-04-10 14:00:00 GMT+2 (Central European Summer Time)
        var berlinDate = new MinimalTemporalZonedDateTime(epoch, "Europe/Berlin");
        expect(relativeTime.format(berlinDate)).to.equal("12 hours ago");
      } finally {
        global.Temporal = polyfillTemporal;
      }
    });

    it("should support daylight savings edge cases", function() {
      clock = sinon.useFakeTimers(new Date("2017-02-19T02:00:00.000Z").getTime());

      // Target: 2017-02-18 23:00:00 GMT-2 (BRST)
      // Now: 2017-02-18 23:00:00 GMT-3 (BRT)
      // expect(relativeTime.format(new Date("2017-02-19T01:00:00.000Z"), {
      //   timeZone: "America/Sao_Paulo"
      // })).to.equal("1 hour ago");
      // TODO: This currently fails and returns "now".

      // Target: 2017-03-12 01:00:00 GMT-8 (PST)
      // Now: 2017-03-12 03:00:00 GMT-7 (PDT)
      clock = sinon.useFakeTimers(new Date("2017-03-12T10:00:00.000Z").getTime());
      var dstDate = global.Temporal.ZonedDateTime.from(
        "2017-03-12T01:00:00-08:00[America/Los_Angeles]"
      );
      expect(relativeTime.format(dstDate)).to.equal("1 hour ago");
    });
  });
});
