var cldrData = require("cldr-data");
var Globalize = require("globalize");
var RelativeTime = require("./src/relative-time").default;

// Feed Globalize on CLDR.
Globalize.load(cldrData.entireSupplemental(), cldrData.entireMainFor("en"));
Globalize.locale("en");

var relativeTime = new RelativeTime();
console.log(relativeTime.format(new Date()));
