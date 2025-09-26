import RelativeTime from "../src/relative-time";
import FakeTemporalZonedDateTime, { normalizeTimeZone } from "./fake-temporal-zoned-date-time";

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

const TemporalPolyfill = {
  Instant: FakeTemporalInstant,
  ZonedDateTime: FakeTemporalZonedDateTime,
  Now: {
    instant: function() {
      return new FakeTemporalInstant(Date.now());
    },
    zonedDateTimeISO: function(timeZoneLike) {
      const zone = normalizeTimeZone(timeZoneLike) || "UTC";
      return FakeTemporalZonedDateTime.fromInstant(this.instant(), zone);
    }
  }
};

function toIsoUtc(dateTime) {
  if (dateTime.includes("[")) {
    return dateTime;
  }
  const parts = dateTime.split(" ");
  const date = parts[0];
  const time = parts[1] ? parts[1] : "00:00:00";
  const segments = time.split(":").map(function(segment) {
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
  let relativeTime;
  let originalTemporal;
  let baseNow;

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

      const eveningNow = zoned("2016-04-10 01:00:00");
      expect(relativeTime.format(zoned("2016-04-09 19:00:00"), {now: eveningNow})).to.equal("6 hours ago");
      expect(relativeTime.format(zoned("2016-04-09 18:00:00"), {now: eveningNow})).to.equal("yesterday");

      const lateNow = zoned("2016-04-10 23:00:00");
      expect(relativeTime.format(zoned("2016-04-11 05:00:00"), {now: lateNow})).to.equal("in 6 hours");
      expect(relativeTime.format(zoned("2016-04-11 06:00:00"), {now: lateNow})).to.equal("tomorrow");

      const janEnd = zoned("2016-01-31 23:00:00");
      expect(relativeTime.format(zoned("2016-02-01 05:00:00"), {now: janEnd})).to.equal("in 6 hours");
      expect(relativeTime.format(zoned("2016-02-01 07:00:00"), {now: janEnd})).to.equal("tomorrow");

      const yearEnd = zoned("2016-12-31 23:00:00");
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

      const aprilSixth = zoned("2016-04-06 12:00:00");
      expect(relativeTime.format(zoned("2016-03-31 23:59:00"), {now: aprilSixth})).to.equal("6 days ago");

      const aprilTwentyFifth = zoned("2016-04-25 23:00:00");
      expect(relativeTime.format(zoned("2016-05-01 00:00:00"), {now: aprilTwentyFifth})).to.equal("in 6 days");
    });

    it("should format months-distant dates", function() {
      expect(relativeTime.format(zoned("2016-01-01 00:00:00"), {now: baseNow})).to.equal("3 months ago");
      expect(relativeTime.format(zoned("2016-03-01 00:00:00"), {now: baseNow})).to.equal("last month");
      expect(relativeTime.format(zoned("2016-05-01 00:00:00"), {now: baseNow})).to.equal("next month");
      expect(relativeTime.format(zoned("2016-12-01 23:59:00"), {now: baseNow})).to.equal("in 8 months");

      const janTwelve = zoned("2017-01-12 18:30:00");
      expect(relativeTime.format(zoned("2016-12-29 18:30:00"), {now: janTwelve})).to.equal("last month");

      const decTwentyNine = zoned("2016-12-29 18:30:00");
      expect(relativeTime.format(zoned("2017-01-12 18:30:00"), {now: decTwentyNine})).to.equal("next month");

      const febTwentyEight = zoned("2016-02-28 12:00:00");
      expect(relativeTime.format(zoned("2015-12-31 23:59:00"), {now: febTwentyEight})).to.equal("2 months ago");
    });

    it("should format years-distant dates", function() {
      expect(relativeTime.format(zoned("2010-06-01 12:00:00"), {now: baseNow})).to.equal("6 years ago");
      expect(relativeTime.format(zoned("2015-12-31 23:59:00"), {now: baseNow})).to.equal("last year");
      expect(relativeTime.format(zoned("2017-01-01 00:00:00"), {now: baseNow})).to.equal("next year");

      const octSecond = zoned("2016-10-02 12:00:00");
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
      const losAngelesDate = zoned("2016-04-09T17:00:00-07:00[America/Los_Angeles]");
      expect(relativeTime.format(losAngelesDate, {now: baseNow})).to.equal("yesterday");

      const berlinDate = zoned("2016-04-10T02:00:00+02:00[Europe/Berlin]");
      expect(relativeTime.format(berlinDate, {now: baseNow})).to.equal("12 hours ago");

      const losAngelesMarchDate = zoned("2016-03-31T17:00:00-07:00[America/Los_Angeles]");
      expect(relativeTime.format(losAngelesMarchDate, {now: baseNow})).to.equal("last month");

      const berlinAprilDate = zoned("2016-04-01T02:00:00+02:00[Europe/Berlin]");
      expect(relativeTime.format(berlinAprilDate, {now: baseNow})).to.equal("9 days ago");

      const losAngelesYearDate = zoned("2015-12-31T16:00:00-08:00[America/Los_Angeles]");
      expect(relativeTime.format(losAngelesYearDate, {now: baseNow})).to.equal("last year");

      const berlinYearDate = zoned("2016-01-01T01:00:00+01:00[Europe/Berlin]");
      expect(relativeTime.format(berlinYearDate, {now: baseNow})).to.equal("3 months ago");
    });

    it("should format daylight savings edge cases", function() {
      baseNow = zoned("2017-03-12T10:00:00Z[UTC]");
      const dstDate = zoned("2017-03-12T01:00:00-08:00[America/Los_Angeles]");
      expect(relativeTime.format(dstDate, {now: baseNow})).to.equal("1 hour ago");
    });
  });

  describe("Temporal inputs", function() {
    it("should accept Temporal.Instant values", function() {
      const instant = global.Temporal.Instant.from("2016-04-10T11:59:01Z");
      expect(relativeTime.format(instant, {now: baseNow})).to.equal("59 seconds ago");
    });

    it("should accept Temporal.Instant now values when a time zone is known", function() {
      const instantNow = global.Temporal.Instant.from("2016-04-10T12:00:00Z");
      expect(relativeTime.format(zoned("2016-04-10 11:59:01"), {now: instantNow})).to.equal("59 seconds ago");
    });

    it("should accept options.timeZone for Temporal.Instant comparisons", function() {
      const target = global.Temporal.Instant.from("2016-04-10T11:59:01Z");
      const instantNow = global.Temporal.Instant.from("2016-04-10T12:00:00Z");
      expect(relativeTime.format(target, {now: instantNow, timeZone: "UTC"})).to.equal("59 seconds ago");
    });

    it("should require a time zone when both values are Temporal.Instant", function() {
      const target = global.Temporal.Instant.from("2016-04-10T11:59:01Z");
      const instantNow = global.Temporal.Instant.from("2016-04-10T12:00:00Z");
      expect(function() {
        relativeTime.format(target, {now: instantNow});
      }).to.throw(TypeError, /timeZone option or ZonedDateTime/);
    });

    it("should use Temporal.Now when now is omitted", function() {
      const instantNow = zoned("2016-04-10 12:00:00");
      const originalInstant = global.Temporal.Now.instant;
      const originalZoned = global.Temporal.Now.zonedDateTimeISO;

      global.Temporal.Now.instant = function() {
        return new FakeTemporalInstant(instantNow.getTime());
      };
      global.Temporal.Now.zonedDateTimeISO = function(timeZoneLike) {
        const zone = normalizeTimeZone(timeZoneLike) || "UTC";
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
