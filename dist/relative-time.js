"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * Rule: (equivalent for future)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [0s, 1min[ - just now
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [1min, 2min[ - 1 minute ago
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [xmin, x+1min[ - x minutes ago
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [1h, 2h[ - 1 hour ago
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [xh, x+1h[ - x hours ago
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [xh, x+1h[ - yesterday if x >= 8 and range is on different days.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [1d, 2d[ - yesterday
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [xd, x+1d[ - x days ago
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [xd, x+1d[ - last month if x >= 7 and range is on different months.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [1month, 2month[ - last month
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [xmonth, x+1month[ - x months ago
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [xmonth, x+1month[ - last year if x >= 3 and range is on different years.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [1y, 2y[ - last year
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * [xy, x+1y[ - x years ago
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */


var _globalize = require("globalize");

var _globalize2 = _interopRequireDefault(_globalize);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var second = 1e3;
var minute = 6e4;
var hour = 36e5;
var day = 864e5;
var month = 2592e6;

var _6hours = 6 * hour;
var _7days = 7 * day;
var _3months = 3 * month;

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

var RelativeTime = function () {
  function RelativeTime() {
    _classCallCheck(this, RelativeTime);

    this.formatters = RelativeTime.initializeFormatters.apply(RelativeTime, arguments);
  }

  _createClass(RelativeTime, [{
    key: "format",
    value: function format(date) {
      var formatters = this.formatters;
      var now = new Date();
      var diff = date.getTime() - now.getTime();
      var absDiff = Math.abs(diff);
      var round = Math[diff > 0 ? "floor" : "ceil"];

      // just now.
      if (absDiff < minute) {
        return formatters.second(round(diff / second));
      }

      // x minutes ago.
      if (absDiff < hour) {
        return formatters.minute(round(diff / minute));
      }

      // x hours ago or yesterday.
      if (absDiff < day) {
        var diffDays = date.getDate() - now.getDate();
        if (absDiff > _6hours && diffDays) {
          return formatters.day(diffDays);
        }
        return formatters.hour(round(diff / hour));
      }

      // x days ago or last month
      if (absDiff < month) {
        var _diffMonths = date.getMonth() - now.getMonth();
        if (absDiff > _7days && _diffMonths) {
          return formatters.month(_diffMonths);
        }
        var _diffDays = date.getDate() - now.getDate();
        if (_diffMonths) {
          _diffDays += date > now ? daysInMonth(now) : -daysInMonth(date);
        }
        return formatters.day(_diffDays);
      }

      // x months ago or last year or x years ago
      var diffYears = date.getFullYear() - now.getFullYear();
      if (absDiff > _3months && diffYears) {
        return formatters.year(diffYears);
      }
      var diffMonths = date.getMonth() - now.getMonth();
      if (diffYears) {
        diffMonths += date > now ? 12 : -12;
      }
      return formatters.month(diffMonths);
    }
  }]);

  return RelativeTime;
}();

// TODO: Remove redundancy. The only reason this code is that ugly is to get
// supported by globalize-compiler (it will read the static formatters).


exports.default = RelativeTime;
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
