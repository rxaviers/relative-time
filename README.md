# Relative Time

Formats JavaScript dates to relative time strings (e.g., "3 hours ago").

Based on the [Unicode CLDR][] locale data. Powered by [globalizejs/globalize][].

[Unicode CLDR]: http://cldr.unicode.org/
[globalizejs/globalize]: http://globalizejs.com/

## Usage

    npm install --save relative-time globalize cldr-data

```js
var cldrData = require("cldr-data");
var Globalize = require("globalize");
var RelativeTime = require("relative-time");

// Feed Globalize on CLDR.
Globalize.load(cldrData.entireSupplemental(), cldrData.entireMainFor("en"));
Globalize.locale("en");

var relativeTime = new RelativeTime();
console.log(relativeTime.format(new Date()));
// > now
```

## License

MIT © [Rafael Xavier de Souza](http://rafael.xavier.blog.br)
