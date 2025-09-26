const RelativeTime = require("./src/relative-time").default;

const relativeTime = new RelativeTime();
const now = Temporal.Now.instant();
console.log(relativeTime.format(now));
