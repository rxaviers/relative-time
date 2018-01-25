// import Globalize from "globalize";
// import ZonedDateTime from "zoned-date-time";

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
  // date = date instanceof ZonedDateTime ? date.clone() : new Date(date.getTime());
  date = new Date(date.getTime());
  switch (unit) {
    case "year": date.setMonth(0);
    // falls through
    case "month": date.setDate(1);
    // falls through
    case "day": date.setHours(0);
    // falls through
    case "hour": date.setMinutes(0);
    // falls through
    case "minute": date.setSeconds(0);
    // falls through
    case "second": date.setMilliseconds(0);
  }
  return date;
}

class RelativeTime {
  constructor() {
    this.rtf = new Intl.RelativeTimeFormat(undefined);
  }

  format(date, {timeZoneData = null, unit = "best-fit"} = {}) {
    var formatters = this.formatters;
    var now = new Date();

    if (timeZoneData) {
      date = new ZonedDateTime(date, timeZoneData);
      now = new ZonedDateTime(now, timeZoneData);
    }

    var diff = {
      _: {},
      ms: date.getTime() - now.getTime(),
      years: date.getFullYear() - now.getFullYear()
    };
    var round = Math[diff.ms > 0 ? "floor" : "ceil"];

    defineCachedGetter(diff, "months", function() {
      return this.years * 12 + date.getMonth() - now.getMonth();
    });
    defineCachedGetter(diff, "days", function() {
      return round((startOf(date, "day") - startOf(now, "day")) / day);
    });
    defineCachedGetter(diff, "hours", function() {
      return round((startOf(date, "hour") - startOf(now, "hour")) / hour);
    });
    defineCachedGetter(diff, "minutes", function() {
      return round((startOf(date, "minute") - startOf(now, "minute")) / minute);
    });
    defineCachedGetter(diff, "seconds", function() {
      return round((startOf(date, "second") - startOf(now, "second")) / second);
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
      case "year": return this.rtf.format(diff.years, unit);
      case "month": return this.rtf.format(diff.months, unit);
      // case "week": return formatters.week(diff.weeks);
      case "day": return this.rtf.format(diff.days, unit);
      case "hour": return this.rtf.format(diff.hours, unit);
      case "minute": return this.rtf.format(diff.minutes, unit);
      default: return this.rtf.format(diff.seconds, unit);
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
