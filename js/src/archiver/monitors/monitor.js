var INTERVAL, Monitor;

INTERVAL = 10000;

Monitor = (function() {
  function Monitor(options) {
    this.graphite = options.graphite;
    this.server = options.server;
    setInterval((function(_this) {
      return function() {
        return _this.check();
      };
    })(this), INTERVAL);
  }

  Monitor.prototype.check = function() {};

  return Monitor;

})();

module.exports = Monitor;

//# sourceMappingURL=monitor.js.map
