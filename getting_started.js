let Temporal = globalThis.Temporal;
if (!Temporal) {
  Temporal = require("@js-temporal/polyfill").Temporal;
  globalThis.Temporal = Temporal;
}

const RelativeTime = require("./dist/relative-time").default;

const relativeTime = new RelativeTime();
const now = Temporal.Now.zonedDateTimeISO();
console.log(relativeTime.format(now));
