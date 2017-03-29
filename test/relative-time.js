import RelativeTime from "../src/relative-time";
import sinon from "sinon";

describe("relative-time", function() {
  var clock, relativeTime;

  before(function() {
    relativeTime = new RelativeTime();
  });

  beforeEach(function() {
    clock = sinon.useFakeTimers(new Date("2016-04-10 12:00:00").getTime());
  });

  afterEach(function() {
    clock.restore();
  });

  describe("bestFit", function() {
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
      expect(relativeTime.format(new Date("2016-11-31 23:59"))).to.equal("in 8 months");

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
    it("shold format relative time using seconds", function() {
      expect(relativeTime.format(new Date("2016-04-10 11:59:01"), "second")).to.equal("59 seconds ago");
      expect(relativeTime.format(new Date("2016-04-10 11:01:00"), "second")).to.equal("3,540 seconds ago");
      expect(relativeTime.format(new Date("2016-04-10 00:00"), "second")).to.equal("43,200 seconds ago");
    });

    it("shold format relative time using minutes", function() {
      expect(relativeTime.format(new Date("2016-04-10 12:00:47"), "minute")).to.equal("this minute");
      expect(relativeTime.format(new Date("2016-04-10 11:59:45"), "minute")).to.equal("1 minute ago");
      expect(relativeTime.format(new Date("2016-04-10 11:01:00"), "minute")).to.equal("59 minutes ago");
      expect(relativeTime.format(new Date("2016-04-01 00:00"), "minute")).to.equal("13,680 minutes ago");
    });

    it("shold format relative time using hours", function() {
      expect(relativeTime.format(new Date("2016-04-10 12:45:00"), "hour")).to.equal("this hour");
      expect(relativeTime.format(new Date("2016-04-10 11:01:00"), "hour")).to.equal("1 hour ago");
      expect(relativeTime.format(new Date("2016-04-10 00:00"), "hour")).to.equal("12 hours ago");
      expect(relativeTime.format(new Date("2016-04-01 00:00"), "hour")).to.equal("228 hours ago");
      expect(relativeTime.format(new Date("2016-01-01 00:00"), "hour")).to.equal("2,413 hours ago");
    });

    it("shold format relative time using days", function() {
      expect(relativeTime.format(new Date("2016-04-10 11:30:00"), "day")).to.equal("today");
      expect(relativeTime.format(new Date("2016-01-01 00:00"), "day")).to.equal("100 days ago");
    });

    it("shold format relative time using months", function() {
      expect(relativeTime.format(new Date("2016-04-10 23:59:59"), "month")).to.equal("this month");
      expect(relativeTime.format(new Date("2017-01-01 00:00"), "month")).to.equal("in 9 months");
    });
  });
});
