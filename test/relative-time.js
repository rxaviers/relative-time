import RelativeTime from "../src/relative-time";
import ianaTzData from "iana-tz-data";
import sinon from "sinon";

describe("relative-time", function() {
  var clock, relativeTime;

  before(function() {
    relativeTime = new RelativeTime();
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
      expect(relativeTime.format(new Date("2016-01-01 00:00"), {unit: "hour"})).to.equal("2,413 hours ago");
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
      // Target: 2016-04-09 17:00:00 GMT-7 (PDT)
      // Now: 2016-04-10 05:00:00 GMT-7 (PDT)
      expect(relativeTime.format(new Date("2016-04-10T00:00:00Z"), {
        timeZoneData: ianaTzData.zoneData.America.Los_Angeles
      })).to.equal("yesterday");

      // Target: 2016-04-10 14:00:00 GMT+2 (Central European Summer Time)
      // Now: 2016-04-10 14:00:00 GMT+2 (Central European Summer Time)
      expect(relativeTime.format(new Date("2016-04-10T00:00:00Z"), {
        timeZoneData: ianaTzData.zoneData.Europe.Berlin
      })).to.equal("12 hours ago");

      // Target: 2016-03-31 17:00:00 GMT-7 (PDT)
      // Now: 2016-04-10 05:00:00 GMT-7 (PDT)
      expect(relativeTime.format(new Date("2016-04-01T00:00:00Z"), {
        timeZoneData: ianaTzData.zoneData.America.Los_Angeles
      })).to.equal("last month");

      // Target: 2016-04-01 02:00:00 GMT+2 (Central European Summer Time)
      // Now: 2016-04-10 14:00:00 GMT+2 (Central European Summer Time)
      expect(relativeTime.format(new Date("2016-04-01T00:00:00Z"), {
        timeZoneData: ianaTzData.zoneData.Europe.Berlin
      })).to.equal("9 days ago");

      // Target: 2015-12-31 16:00:00 GMT-8 (PST)
      // Now: 2016-04-10 05:00:00 GMT-7 (PDT)
      expect(relativeTime.format(new Date("2016-01-01T00:00:00Z"), {
        timeZoneData: ianaTzData.zoneData.America.Los_Angeles
      })).to.equal("last year");

      // Target: 2016-01-01 01:00:00 GMT+1 (Central European Standard Time)'
      // Now: 2016-04-10 14:00:00 GMT+2 (Central European Summer Time)
      expect(relativeTime.format(new Date("2016-01-01T00:00:00Z"), {
        timeZoneData: ianaTzData.zoneData.Europe.Berlin
      })).to.equal("3 months ago");
    });

    it("should support daylight savings edge cases", function() {
      clock = sinon.useFakeTimers(new Date("2017-02-19T02:00:00.000Z").getTime());

      // Target: 2017-02-18 23:00:00 GMT-2 (BRST)
      // Now: 2017-02-18 23:00:00 GMT-3 (BRT)
      // expect(relativeTime.format(new Date("2017-02-19T01:00:00.000Z"), {
      //   timeZoneData: ianaTzData.zoneData.America.Sao_Paulo
      // })).to.equal("1 hour ago");
      // TODO: This currently fails and returns "now".

      // Target: 2017-03-12 01:00:00 GMT-8 (PST)
      // Now: 2017-03-12 03:00:00 GMT-7 (PDT)
      clock = sinon.useFakeTimers(new Date("2017-03-12T10:00:00.000Z").getTime());
      expect(relativeTime.format(new Date("2017-03-12T09:00:00.000Z"), {
        timeZoneData: ianaTzData.zoneData.America.Los_Angeles
      })).to.equal("1 hour ago");
    });
  });
});
