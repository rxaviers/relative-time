const RelativeTime = require("./src/relative-time").default;

const relativeTime = new RelativeTime();
const now = Temporal.Now.zonedDateTimeISO();
console.log(relativeTime.format(now));
