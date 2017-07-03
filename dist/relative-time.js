"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _globalize = require("globalize");

var _globalize2 = _interopRequireDefault(_globalize);

var _zonedDateTime = require("zoned-date-time");

var _zonedDateTime2 = _interopRequireDefault(_zonedDateTime);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var second = 1e3;
var minute = 6e4;
var hour = 36e5;
var day = 864e5;
// const week = 6048e5;
// const month = 2592e6;

function defineCachedGetter(obj, prop, get) {
  defineGetter(obj, prop, function () {
    if (!this._[prop]) {
      this._[prop] = get.call(this);
    }
    return this._[prop];
  });
}

function defineGetter(obj, prop, get) {
  Object.defineProperty(obj, prop, { get: get });
}

function startOf(date, unit) {
  date = date instanceof _zonedDateTime2.default ? date.clone() : new Date(date.getTime());
  switch (unit) {
    case "year":
      date.setMonth(0);
    // falls through
    case "month":
      date.setDate(1);
    // falls through
    case "day":
      date.setHours(0);
    // falls through
    case "hour":
      date.setMinutes(0);
    // falls through
    case "minute":
      date.setSeconds(0);
    // falls through
    case "second":
      date.setMilliseconds(0);
  }
  return date;
}

var RelativeTime = function () {
  function RelativeTime() {
    _classCallCheck(this, RelativeTime);

    this.formatters = RelativeTime.initializeFormatters.apply(RelativeTime, arguments);
  }

  _createClass(RelativeTime, [{
    key: "format",
    value: function format(date) {
      var _ref = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var _ref$timeZoneData = _ref.timeZoneData;
      var timeZoneData = _ref$timeZoneData === undefined ? null : _ref$timeZoneData;
      var _ref$unit = _ref.unit;
      var unit = _ref$unit === undefined ? "best-fit" : _ref$unit;

      var formatters = this.formatters;
      var now = new Date();

      if (timeZoneData) {
        date = new _zonedDateTime2.default(date, timeZoneData);
        now = new _zonedDateTime2.default(now, timeZoneData);
      }

      var diff = {
        _: {},
        ms: date.getTime() - now.getTime(),
        years: date.getFullYear() - now.getFullYear()
      };
      var round = Math[diff.ms > 0 ? "floor" : "ceil"];

      defineCachedGetter(diff, "months", function () {
        return this.years * 12 + date.getMonth() - now.getMonth();
      });
      defineCachedGetter(diff, "days", function () {
        return round((startOf(date, "day") - startOf(now, "day")) / day);
      });
      defineCachedGetter(diff, "hours", function () {
        return round((startOf(date, "hour") - startOf(now, "hour")) / hour);
      });
      defineCachedGetter(diff, "minutes", function () {
        return round((startOf(date, "minute") - startOf(now, "minute")) / minute);
      });
      defineCachedGetter(diff, "seconds", function () {
        return round((startOf(date, "second") - startOf(now, "second")) / second);
      });

      var absDiff = {
        _: {}
      };

      defineGetter(absDiff, "years", function () {
        return Math.abs(diff.years);
      });
      defineGetter(absDiff, "months", function () {
        return Math.abs(diff.months);
      });
      defineGetter(absDiff, "days", function () {
        return Math.abs(diff.days);
      });
      defineGetter(absDiff, "hours", function () {
        return Math.abs(diff.hours);
      });
      defineGetter(absDiff, "minutes", function () {
        return Math.abs(diff.minutes);
      });
      defineGetter(absDiff, "seconds", function () {
        return Math.abs(diff.seconds);
      });

      if (unit === "best-fit") {
        unit = RelativeTime.bestFit(absDiff);
      }

      switch (unit) {
        case "year":
          return formatters.year(diff.years);
        case "month":
          return formatters.month(diff.months);
        // case "week": return formatters.week(diff.weeks);
        case "day":
          return formatters.day(diff.days);
        case "hour":
          return formatters.hour(diff.hours);
        case "minute":
          return formatters.minute(diff.minutes);
        default:
          return formatters.second(diff.seconds);
      }
    }
  }]);

  return RelativeTime;
}();

exports.default = RelativeTime;


RelativeTime.bestFit = function (absDiff) {
  var threshold = this.threshold;
  switch (true) {
    case absDiff.years > 0 && absDiff.months > threshold.month:
      return "year";
    case absDiff.months > 0 && absDiff.days > threshold.day:
      return "month";
    // case absDiff.months > 0 && absDiff.weeks > threshold.week: return "month";
    // case absDiff.weeks > 0 && absDiff.days > threshold.day: return "week";
    case absDiff.days > 0 && absDiff.hours > threshold.hour:
      return "day";
    case absDiff.hours > 0 && absDiff.minutes > threshold.minute:
      return "hour";
    case absDiff.minutes > 0 && absDiff.seconds > threshold.second:
      return "minute";
    default:
      return "second";
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

// TODO: Remove redundancy. The only reason this code is that ugly is to get
// supported by globalize-compiler (which reads the static formatters).
RelativeTime.initializeFormatters = function (globalize) {
  if (globalize) {
    return {
      second: globalize.relativeTimeFormatter("second"),
      minute: globalize.relativeTimeFormatter("minute"),
      hour: globalize.relativeTimeFormatter("hour"),
      day: globalize.relativeTimeFormatter("day"),
      month: globalize.relativeTimeFormatter("month"),
      year: globalize.relativeTimeFormatter("year")
    };
  }
  return {
    second: _globalize2.default.relativeTimeFormatter("second"),
    minute: _globalize2.default.relativeTimeFormatter("minute"),
    hour: _globalize2.default.relativeTimeFormatter("hour"),
    day: _globalize2.default.relativeTimeFormatter("day"),
    month: _globalize2.default.relativeTimeFormatter("month"),
    year: _globalize2.default.relativeTimeFormatter("year")
  };
};
