"use strict";

require("babel-core/register");

global.expect = require("chai").expect;

var Globalize = require("globalize");
Globalize.load(
  require("cldr-data").entireSupplemental(),
  require("cldr-data").entireMainFor("en")
);
Globalize.locale("en");
