"use strict";

process.env.BABEL_DISABLE_CACHE = "1";

require("babel-core/register");

global.expect = require("chai").expect;
