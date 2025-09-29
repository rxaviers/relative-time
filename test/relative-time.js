import RelativeTime from "../src/relative-time";
import { Temporal as TemporalPolyfill } from "@js-temporal/polyfill";

function plain(dateTime) {
  return global.Temporal.PlainDateTime.from(dateTime);
}

function zoned(dateTime) {
  return global.Temporal.ZonedDateTime.from(dateTime);
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
    baseNow = plain("2016-04-10T12:00:00");
  });

  describe("bestFit", function() {
    it("should format seconds-distant dates", function() {
      expect(relativeTime.format(plain("2016-04-10T11:59:01"), {now: baseNow})).to.equal("59 seconds ago");
      expect(relativeTime.format(plain("2016-04-10T12:00:00"), {now: baseNow})).to.equal("now");
      expect(relativeTime.format(plain("2016-04-10T12:00:59"), {now: baseNow})).to.equal("in 59 seconds");
    });

    it("should format minutes-distant dates", function() {
      expect(relativeTime.format(plain("2016-04-10T11:01:00"), {now: baseNow})).to.equal("59 minutes ago");
      expect(relativeTime.format(plain("2016-04-10T11:59:00"), {now: baseNow})).to.equal("1 minute ago");
      expect(relativeTime.format(plain("2016-04-10T12:01:00"), {now: baseNow})).to.equal("in 1 minute");
      expect(relativeTime.format(plain("2016-04-10T12:01:59"), {now: baseNow})).to.equal("in 1 minute");
      expect(relativeTime.format(plain("2016-04-10T12:59:59"), {now: baseNow})).to.equal("in 59 minutes");
    });

    it("should format hours-distant dates", function() {
      expect(relativeTime.format(plain("2016-04-10T00:00:00"), {now: baseNow})).to.equal("12 hours ago");
      expect(relativeTime.format(plain("2016-04-10T13:00:00"), {now: baseNow})).to.equal("in 1 hour");
      expect(relativeTime.format(plain("2016-04-10T13:59:59"), {now: baseNow})).to.equal("in 1 hour");
      expect(relativeTime.format(plain("2016-04-10T23:59:59"), {now: baseNow})).to.equal("in 11 hours");

      const eveningNow = plain("2016-04-10T01:00:00");
      expect(relativeTime.format(plain("2016-04-09T19:00:00"), {now: eveningNow})).to.equal("6 hours ago");
      expect(relativeTime.format(plain("2016-04-09T18:00:00"), {now: eveningNow})).to.equal("yesterday");

      const lateNow = plain("2016-04-10T23:00:00");
      expect(relativeTime.format(plain("2016-04-11T05:00:00"), {now: lateNow})).to.equal("in 6 hours");
      expect(relativeTime.format(plain("2016-04-11T06:00:00"), {now: lateNow})).to.equal("tomorrow");

      const janEnd = plain("2016-01-31T23:00:00");
      expect(relativeTime.format(plain("2016-02-01T05:00:00"), {now: janEnd})).to.equal("in 6 hours");
      expect(relativeTime.format(plain("2016-02-01T07:00:00"), {now: janEnd})).to.equal("tomorrow");

      const yearEnd = plain("2016-12-31T23:00:00");
      expect(relativeTime.format(plain("2017-01-01T05:00:00"), {now: yearEnd})).to.equal("in 6 hours");
      expect(relativeTime.format(plain("2017-01-01T07:00:00"), {now: yearEnd})).to.equal("tomorrow");
    });

    it("should format days-distant dates", function() {
      expect(relativeTime.format(plain("2016-04-01T00:00:00"), {now: baseNow})).to.equal("9 days ago");
      expect(relativeTime.format(plain("2016-04-09T18:00:00"), {now: baseNow})).to.equal("yesterday");
      expect(relativeTime.format(plain("2016-04-11T09:00:00"), {now: baseNow})).to.equal("tomorrow");
      expect(relativeTime.format(plain("2016-04-30T23:59:00"), {now: baseNow})).to.equal("in 20 days");
      expect(relativeTime.format(plain("2016-03-31T23:59:00"), {now: baseNow})).to.equal("last month");
      expect(relativeTime.format(plain("2016-05-01T00:00:00"), {now: baseNow})).to.equal("next month");

      const aprilSixth = plain("2016-04-06T12:00:00");
      expect(relativeTime.format(plain("2016-03-31T23:59:00"), {now: aprilSixth})).to.equal("6 days ago");

      const aprilTwentyFifth = plain("2016-04-25T23:00:00");
      expect(relativeTime.format(plain("2016-05-01T00:00:00"), {now: aprilTwentyFifth})).to.equal("in 6 days");
    });

    it("should format months-distant dates", function() {
      expect(relativeTime.format(plain("2016-01-01T00:00:00"), {now: baseNow})).to.equal("3 months ago");
      expect(relativeTime.format(plain("2016-03-01T00:00:00"), {now: baseNow})).to.equal("last month");
      expect(relativeTime.format(plain("2016-05-01T00:00:00"), {now: baseNow})).to.equal("next month");
      expect(relativeTime.format(plain("2016-12-01T23:59:00"), {now: baseNow})).to.equal("in 8 months");

      const janTwelve = plain("2017-01-12T18:30:00");
      expect(relativeTime.format(plain("2016-12-29T18:30:00"), {now: janTwelve})).to.equal("last month");

      const decTwentyNine = plain("2016-12-29T18:30:00");
      expect(relativeTime.format(plain("2017-01-12T18:30:00"), {now: decTwentyNine})).to.equal("next month");

      const febTwentyEight = plain("2016-02-28T12:00:00");
      expect(relativeTime.format(plain("2015-12-31T23:59:00"), {now: febTwentyEight})).to.equal("2 months ago");
    });

    it("should format years-distant dates", function() {
      expect(relativeTime.format(plain("2010-06-01T12:00:00"), {now: baseNow})).to.equal("6 years ago");
      expect(relativeTime.format(plain("2015-12-31T23:59:00"), {now: baseNow})).to.equal("last year");
      expect(relativeTime.format(plain("2017-01-01T00:00:00"), {now: baseNow})).to.equal("next year");

      const octSecond = plain("2016-10-02T12:00:00");
      expect(relativeTime.format(plain("2017-01-01T00:00:00"), {now: octSecond})).to.equal("next year");
    });

    it("should format relative time using hours", function() {
      expect(relativeTime.format(plain("2016-04-10T12:45:00"), {unit: "hour", now: baseNow})).to.equal("this hour");
      expect(relativeTime.format(plain("2016-04-10T11:01:00"), {unit: "hour", now: baseNow})).to.equal("1 hour ago");
      expect(relativeTime.format(plain("2016-04-10T00:00:00"), {unit: "hour", now: baseNow})).to.equal("12 hours ago");
      expect(relativeTime.format(plain("2016-04-01T00:00:00"), {unit: "hour", now: baseNow})).to.equal("228 hours ago");
      expect(relativeTime.format(plain("2016-01-01T00:00:00"), {unit: "hour", now: baseNow})).to.equal("2,412 hours ago");
    });

    it("should format relative time using days", function() {
      expect(relativeTime.format(plain("2016-04-10T11:30:00"), {unit: "day", now: baseNow})).to.equal("today");
      expect(relativeTime.format(plain("2016-01-01T00:00:00"), {unit: "day", now: baseNow})).to.equal("100 days ago");
    });

    it("should format relative time using months", function() {
      expect(relativeTime.format(plain("2016-04-10T23:59:59"), {unit: "month", now: baseNow})).to.equal("this month");
      expect(relativeTime.format(plain("2017-01-01T00:00:00"), {unit: "month", now: baseNow})).to.equal("in 9 months");
    });
  });

  describe("time zone", function() {
    it("should support using specific time zone", function() {
      const losAngelesDate = zoned("2016-04-09T17:00:00-07:00[America/Los_Angeles]");
      const losAngelesNow = zoned("2016-04-10T05:00:00-07:00[America/Los_Angeles]");
      expect(relativeTime.format(losAngelesDate, {now: losAngelesNow})).to.equal("yesterday");

      const berlinDate = zoned("2016-04-10T02:00:00+02:00[Europe/Berlin]");
      const berlinNow = zoned("2016-04-10T14:00:00+02:00[Europe/Berlin]");
      expect(relativeTime.format(berlinDate, {now: berlinNow})).to.equal("12 hours ago");

      const losAngelesMarchDate = zoned("2016-03-31T17:00:00-07:00[America/Los_Angeles]");
      expect(relativeTime.format(losAngelesMarchDate, {now: losAngelesNow})).to.equal("last month");

      const berlinAprilDate = zoned("2016-04-01T02:00:00+02:00[Europe/Berlin]");
      expect(relativeTime.format(berlinAprilDate, {now: berlinNow})).to.equal("9 days ago");

      const losAngelesYearDate = zoned("2015-12-31T16:00:00-08:00[America/Los_Angeles]");
      expect(relativeTime.format(losAngelesYearDate, {now: losAngelesNow})).to.equal("last year");

      const berlinYearDate = zoned("2016-01-01T01:00:00+01:00[Europe/Berlin]");
      expect(relativeTime.format(berlinYearDate, {now: berlinNow})).to.equal("3 months ago");
    });

    it("should format daylight savings edge cases", function() {
      const losAngelesNow = zoned("2017-03-12T03:00:00-07:00[America/Los_Angeles]");
      const dstDate = zoned("2017-03-12T01:00:00-08:00[America/Los_Angeles]");
      expect(relativeTime.format(dstDate, {now: losAngelesNow})).to.equal("1 hour ago");
    });
  });

  describe("Temporal inputs", function() {
    it("should reject non-ZonedDateTime dates", function() {
      const instant = global.Temporal.Instant.from("2016-04-10T11:59:01Z");
      expect(function() {
        relativeTime.format(instant, {now: baseNow});
      }).to.throw(TypeError, /Temporal\.ZonedDateTime/);
    });

    it("should reject non-PlainDateTime now values for PlainDateTime targets", function() {
      const instantNow = global.Temporal.Instant.from("2016-04-10T12:00:00Z");
      expect(function() {
        relativeTime.format(plain("2016-04-10T11:59:01"), {now: instantNow});
      }).to.throw(TypeError, /Temporal\.PlainDateTime/);
    });

    it("should reject non-ZonedDateTime now values for ZonedDateTime targets", function() {
      const instantNow = global.Temporal.Instant.from("2016-04-10T12:00:00Z");
      expect(function() {
        relativeTime.format(zoned("2016-04-10T11:59:01[UTC]"), {now: instantNow});
      }).to.throw(TypeError, /Temporal\.ZonedDateTime/);
    });

    it("should reject ZonedDateTime now values from a different time zone", function() {
      const losAngelesDate = zoned("2016-04-10T05:00:00-07:00[America/Los_Angeles]");
      const newYorkNow = zoned("2016-04-10T08:00:00-04:00[America/New_York]");
      expect(function() {
        relativeTime.format(losAngelesDate, {now: newYorkNow});
      }).to.throw(TypeError, /same time zone/);
    });

    it("should use Temporal.Now when now is omitted for PlainDateTime targets", function() {
      const stubNow = plain("2016-04-10T12:00:00");
      const originalPlain = global.Temporal.Now.plainDateTimeISO;

      global.Temporal.Now.plainDateTimeISO = function() {
        return stubNow;
      };

      try {
        expect(relativeTime.format(plain("2016-04-10T11:59:01"))).to.equal("59 seconds ago");
      } finally {
        global.Temporal.Now.plainDateTimeISO = originalPlain;
      }
    });

    it("should use Temporal.Now when now is omitted for ZonedDateTime targets", function() {
      const stubNow = zoned("2016-04-10T12:00:00[UTC]");
      const originalZoned = global.Temporal.Now.zonedDateTimeISO;

      global.Temporal.Now.zonedDateTimeISO = function(timeZoneLike) {
        const zone = typeof timeZoneLike === "string" ?
          timeZoneLike : timeZoneLike && timeZoneLike.timeZone;
        return stubNow.withTimeZone(zone || stubNow.timeZoneId);
      };

      try {
        expect(relativeTime.format(zoned("2016-04-10T11:59:01[UTC]"))).to.equal("59 seconds ago");
      } finally {
        global.Temporal.Now.zonedDateTimeISO = originalZoned;
      }
    });
  });
});
