var RelativeTime = require("./src/relative-time").default;

var relativeTime = new RelativeTime();
var now = typeof Temporal !== "undefined" && Temporal.Now ? Temporal.Now.instant() : Date.now();
console.log(relativeTime.format(now));
