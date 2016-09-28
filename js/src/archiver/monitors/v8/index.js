var Monitor, V8, V8Monitor, _, time,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

V8 = require("./v8");

_ = require("underscore");

Monitor = require("../monitor");

time = require("../../utils/time");

V8Monitor = (function(superClass) {
  extend(V8Monitor, superClass);

  function V8Monitor(options) {
    V8Monitor.__super__.constructor.call(this, options);
    this.v8 = new V8();
    this.v8.on("gc:*", (function(_this) {
      return function(data) {
        return _this.onGC(data);
      };
    })(this));
  }

  V8Monitor.prototype.onGC = function(data) {
    this.graphite.timing(["gc", data.type], time.tupleToNanoseconds(data.duration));
    this.graphite.timing(["gc", data.type, "allocated"], data.allocated);
    return this.graphite.timing(["gc", data.type, "released"], data.released);
  };

  V8Monitor.prototype.check = function() {
    var heap, hrtime, memory;
    memory = process.memoryUsage();
    heap = this.v8.getHeapStatistics();
    hrtime = process.hrtime();
    setImmediate((function(_this) {
      return function() {
        var diff;
        diff = process.hrtime(hrtime);
        return _this.graphite.timing(["eventloop", "latency"], time.tupleToNanoseconds(diff));
      };
    })(this));
    this.graphite.timing(["memory", "rss"], memory.rss);
    return _.each(heap, function(value, key) {
      return this.graphite.timing(["memory", key], heap[key]);
    }, this);
  };

  return V8Monitor;

})(Monitor);

module.exports = V8Monitor;

//# sourceMappingURL=index.js.map
