var RelativeTime = require("./src/relative-time").default;

var relativeTime = new RelativeTime();
var now = Temporal.Now.instant();
console.log(relativeTime.format(now));
