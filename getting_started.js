var RelativeTime = require("./src/relative-time").default;

var relativeTime = new RelativeTime();
console.log(relativeTime.format(new Date()));
