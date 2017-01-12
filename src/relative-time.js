/**
 * Rule: (equivalent for future)
 *
 * 0s - now
 * ]0s, 1min[ - x seconds ago
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
import Globalize from "globalize";

const second = 1e3;
const minute = 6e4;
const hour = 36e5;
const day = 864e5;
const month = 2592e6;

const _6hours = 6 * hour;
const _7days = 7 * day;
const _3months = 3 * month;

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export default class RelativeTime {
  constructor() {
    this.formatters = RelativeTime.initializeFormatters(...arguments);
  }

  format(date) {
    var formatters = this.formatters;
    var now = new Date();
    var diff = date.getTime() - now.getTime();
    var absDiff = Math.abs(diff);
    var round = Math[diff > 0 ? "floor" : "ceil"];
    var diffYears = date.getFullYear() - now.getFullYear();
    var diffMonths = date.getMonth() - now.getMonth();
    var diffDays = date.getDate() - now.getDate();
    if (diffYears) {
      diffMonths += date > now ? 12 : -12;
    }
    if (diffMonths) {
      diffDays += date > now ? daysInMonth(now) : -daysInMonth(date);
    }

    // now or x seconds ago.
    if (absDiff < minute) {
      return formatters.second(round(diff / second));
    }

    // x minutes ago.
    if (absDiff < hour) {
      return formatters.minute(round(diff / minute));
    }

    // x hours ago or yesterday.
    if (absDiff < day) {
      if (absDiff > _6hours && diffDays) {
        return formatters.day(diffDays);
      }
      return formatters.hour(round(diff / hour));
    }

    // x days ago or last month
    if (absDiff < month) {
      if (absDiff > _7days && diffMonths) {
        return formatters.month(diffMonths);
      }
      return formatters.day(diffDays);
    }

    // x months ago or last year or x years ago
    if (absDiff > _3months && diffYears) {
      return formatters.year(diffYears);
    }
    return formatters.month(diffMonths);
  }
}

// TODO: Remove redundancy. The only reason this code is that ugly is to get
// supported by globalize-compiler (which reads the static formatters).
RelativeTime.initializeFormatters = function(globalize) {
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
    second: Globalize.relativeTimeFormatter("second"),
    minute: Globalize.relativeTimeFormatter("minute"),
    hour: Globalize.relativeTimeFormatter("hour"),
    day: Globalize.relativeTimeFormatter("day"),
    month: Globalize.relativeTimeFormatter("month"),
    year: Globalize.relativeTimeFormatter("year")
  };
};
