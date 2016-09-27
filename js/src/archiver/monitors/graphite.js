var Client, DEFAULT_INCREMENT, DOT, EXTREME, Graphite, HOSTNAME, P, PLACEHOLDER, SEPARATOR, SLASH, SPACE, TAGS_SEPARATOR, _, debug, rDot, rDots, rDotsExt, rSeparator, rSlash, rSpace;

_ = require("underscore");

P = require("bluebird");

Client = require("node-statsd");

debug = require("debug")("sm:archiver:monitors:graphite");

HOSTNAME = require("os").hostname();

PLACEHOLDER = "<<separator>>";

DEFAULT_INCREMENT = 1;

TAGS_SEPARATOR = ",";

SEPARATOR = ".";

EXTREME = "";

SPACE = "_";

SLASH = ".";

DOT = "+";

rSeparator = new RegExp(PLACEHOLDER, "g");

rSpace = new RegExp(" ", "g");

rDotsExt = /(^\.|\.$)/g;

rSlash = /\//g;

rDots = /\.+/g;

rDot = /\./g;

P.promisifyAll(Client.prototype);

Graphite = (function() {
  function Graphite(opts) {
    this.opts = opts;
    this.client = new Client(this.opts);
    this.PLACEHOLDER = PLACEHOLDER;
    this.SEPARATOR = SEPARATOR;
    this.SPACE = SPACE;
    this.SLASH = SLASH;
    this.DOT = DOT;
    this.EXTREME = EXTREME;
    this.TAGS_SEPARATOR = TAGS_SEPARATOR;
  }

  Graphite.prototype.timing = function(name, value, sampleRate, tags) {
    return this.send("timing", name, value, {
      sampleRate: sampleRate,
      tags: tags
    });
  };

  Graphite.prototype.increment = function(name, value, sampleRate, tags) {
    return this.send("increment", name, value || DEFAULT_INCREMENT, {
      sampleRate: sampleRate,
      tags: tags
    });
  };

  Graphite.prototype.decrement = function(name, value, sampleRate, tags) {
    return this.send("decrement", name, value || DEFAULT_INCREMENT, {
      sampleRate: sampleRate,
      tags: tags
    });
  };

  Graphite.prototype.histogram = function(name, value, sampleRate, tags) {
    return this.send("histogram", name, value, {
      sampleRate: sampleRate,
      tags: tags
    });
  };

  Graphite.prototype.gauge = function(name, value, sampleRate, tags) {
    return this.send("gauge", name, value, {
      sampleRate: sampleRate,
      tags: tags
    });
  };

  Graphite.prototype.unique = function(name, value, sampleRate, tags) {
    return this.send("unique", name, value, {
      sampleRate: sampleRate,
      tags: tags
    });
  };

  Graphite.prototype.set = function(name, value, sampleRate, tags) {
    return this.unique(name, value, {
      sampleRate: sampleRate,
      tags: tags
    });
  };

  Graphite.prototype.send = function(method, metric, value, options) {
    options = _.defaults(options || {}, {
      sampleRate: 1,
      tags: []
    });
    metric = this.stringify(metric);
    this.mock(method, metric, value, options);
    return this.client[method + "Async"](metric, value, options.sampleRate, options.tags);
  };

  Graphite.prototype.stringify = function(name) {
    var string;
    string = Array.isArray(name) ? name.join(this.PLACEHOLDER) : name.replace(rDot, this.PLACEHOLDER);
    string = string.replace(rSpace, this.SPACE).replace(rDot, this.DOT).replace(rSeparator, this.SEPARATOR).replace(rSlash, this.SLASH).replace(rDots, this.SEPARATOR).replace(rDotsExt, this.EXTREME);
    return ("" + HOSTNAME + SEPARATOR + string).toLowerCase();
  };

  Graphite.prototype.mock = function(method, metric, value, options) {
    if (this.opts.mock) {
      return debug("Graphite " + method + " " + metric + " " + value + " " + options.sampleRate + " " + (options.tags.join(this.TAGS_SEPARATOR)));
    }
  };

  return Graphite;

})();

module.exports = Graphite;

//# sourceMappingURL=graphite.js.map
