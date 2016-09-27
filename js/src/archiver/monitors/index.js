var Graphite, Monitors, _, monitors;

_ = require("underscore");

Graphite = require("./graphite");

monitors = {
  v8: require("./v8"),
  server: require("./server")
};

Monitors = (function() {
  function Monitors(core, server, opts) {
    this.core = core;
    this.server = server;
    this.opts = opts;
    this.monitors = {};
    this.graphite = new Graphite(this.opts.graphite);
    _.each(monitors, (function(_this) {
      return function(Monitor, name) {
        return _this.monitors[name] = new Monitor({
          graphite: _this.graphite,
          server: _this.server
        });
      };
    })(this));
  }

  return Monitors;

})();

module.exports = Monitors;

//# sourceMappingURL=index.js.map
