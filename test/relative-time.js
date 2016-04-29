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

  it("should format seconds distant dates", function() {
    expect(relativeTime.format(new Date("2016-04-10 11:59:01"))).to.equal("59 seconds ago");
    expect(relativeTime.format(new Date("2016-04-10 12:00:00"))).to.equal("now");
    expect(relativeTime.format(new Date("2016-04-10 12:00:59"))).to.equal("in 59 seconds");
  });

  it("should format minutes distant dates", function() {
    expect(relativeTime.format(new Date("2016-04-10 11:00:01"))).to.equal("59 minutes ago");
    expect(relativeTime.format(new Date("2016-04-10 11:59"))).to.equal("1 minute ago");
    expect(relativeTime.format(new Date("2016-04-10 12:01"))).to.equal("in 1 minute");
    expect(relativeTime.format(new Date("2016-04-10 12:01:59"))).to.equal("in 1 minute");
    expect(relativeTime.format(new Date("2016-04-10 12:59:59"))).to.equal("in 59 minutes");
  });

  it("should format hours distant dates", function() {
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
  });

  it("should format days distant dates", function() {
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

  it("should format months distant dates", function() {
    expect(relativeTime.format(new Date("2016-01-01 00:00"))).to.equal("3 months ago");
    expect(relativeTime.format(new Date("2016-03-01 00:00"))).to.equal("last month");
    expect(relativeTime.format(new Date("2016-05-01 00:00"))).to.equal("next month");
    expect(relativeTime.format(new Date("2016-11-31 23:59"))).to.equal("in 8 months");

    // sinon.useFakeTimers(new Date("2016-10-02 12:00").getTime());
    // element = shallow(<RelativeTime>{new Date("2017-01-01 00:00")}</RelativeTime>);
    // expect(element.text()).to.equal("in 3 months");

    // sinon.useFakeTimers(new Date("2016-02-28 12:00").getTime());
    // element = shallow(<RelativeTime>{new Date("2015-12-31 23:59")}</RelativeTime>);
    // expect(element.text()).to.equal("3 months ago");
  });

  it("should format years distant dates", function() {
    expect(relativeTime.format(new Date("2010-06-01 12:00"))).to.equal("6 years ago");
    expect(relativeTime.format(new Date("2015-12-31 23:59"))).to.equal("last year");
    expect(relativeTime.format(new Date("2017-01-01 00:00"))).to.equal("next year");
  });
});
