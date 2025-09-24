function getOffsetIndex(zone, timestamp) {
  const {untils} = zone;
  for (let i = 0; i < untils.length; i++) {
    const until = untils[i];
    if (until === null || timestamp < until) {
      return i;
    }
  }
  return untils.length - 1;
}

function getOffsetMinutes(zone, timestamp) {
  return zone.offsets[getOffsetIndex(zone, timestamp)];
}

function toLocal(zone, timestamp) {
  const offsetMinutes = getOffsetMinutes(zone, timestamp);
  return {
    localTimestamp: timestamp - offsetMinutes * 60000,
    offsetMinutes
  };
}

function toUtc(zone, localTimestamp, hintOffsetMinutes) {
  let offsetMinutes = typeof hintOffsetMinutes === "number" ? hintOffsetMinutes : getOffsetMinutes(zone, localTimestamp);
  let utcTimestamp = localTimestamp + offsetMinutes * 60000;
  let previous;

  for (let i = 0; i < 8; i++) {
    const nextOffset = getOffsetMinutes(zone, utcTimestamp);
    const candidate = localTimestamp + nextOffset * 60000;

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

class ZonedDateTime {
  constructor(date, zone) {
    this.zone = zone;
    this.utcTimestamp = date.getTime();
  }

  clone() {
    return new ZonedDateTime(new Date(this.utcTimestamp), this.zone);
  }

  valueOf() {
    return this.getTime();
  }

  getTime() {
    return this.utcTimestamp;
  }

  _getLocalDate() {
    const {localTimestamp, offsetMinutes} = toLocal(this.zone, this.utcTimestamp);
    return {
      date: new Date(localTimestamp),
      offsetMinutes
    };
  }

  _setFromLocalDate(localDate, offsetMinutes) {
    this.utcTimestamp = toUtc(this.zone, localDate.getTime(), offsetMinutes);
    return this.utcTimestamp;
  }

  getFullYear() {
    return this._getLocalDate().date.getUTCFullYear();
  }

  getMonth() {
    return this._getLocalDate().date.getUTCMonth();
  }

  getDate() {
    return this._getLocalDate().date.getUTCDate();
  }

  getHours() {
    return this._getLocalDate().date.getUTCHours();
  }

  getMinutes() {
    return this._getLocalDate().date.getUTCMinutes();
  }

  getSeconds() {
    return this._getLocalDate().date.getUTCSeconds();
  }

  getMilliseconds() {
    return this._getLocalDate().date.getUTCMilliseconds();
  }

  setMonth(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCMonth(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }

  setDate(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCDate(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }

  setHours(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCHours(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }

  setMinutes(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCMinutes(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }

  setSeconds(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCSeconds(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }

  setMilliseconds(value) {
    const {date, offsetMinutes} = this._getLocalDate();
    date.setUTCMilliseconds(value);
    return this._setFromLocalDate(date, offsetMinutes);
  }
}

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
  date = date instanceof ZonedDateTime ? date.clone() : new Date(date.getTime());
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

export default class RelativeTime {
  constructor() {
    this.formatters = RelativeTime.initializeFormatters(...arguments);
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
      case "year": return formatters.year(diff.years);
      case "month": return formatters.month(diff.months);
      // case "week": return formatters.week(diff.weeks);
      case "day": return formatters.day(diff.days);
      case "hour": return formatters.hour(diff.hours);
      case "minute": return formatters.minute(diff.minutes);
      default: return formatters.second(diff.seconds);
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

// TODO: Remove redundancy. The only reason this code is that ugly was to get
// supported by globalize-compiler (which read the static formatters).
RelativeTime.initializeFormatters = function(localesOrFormatter, options) {
  let formatter;
  let locales = localesOrFormatter;
  let formatOptions = options;

  if (localesOrFormatter && typeof localesOrFormatter.format === "function" &&
      typeof localesOrFormatter.resolvedOptions === "function") {
    formatter = localesOrFormatter;
  } else {
    if (localesOrFormatter && typeof localesOrFormatter === "object" && !Array.isArray(localesOrFormatter)) {
      formatOptions = localesOrFormatter;
      locales = undefined;
    }

    formatter = new Intl.RelativeTimeFormat(locales, Object.assign({
      numeric: "auto"
    }, formatOptions));
  }

  return {
    second(value) {
      return formatter.format(value, "second");
    },
    minute(value) {
      return formatter.format(value, "minute");
    },
    hour(value) {
      return formatter.format(value, "hour");
    },
    day(value) {
      return formatter.format(value, "day");
    },
    month(value) {
      return formatter.format(value, "month");
    },
    year(value) {
      return formatter.format(value, "year");
    }
  };
};
