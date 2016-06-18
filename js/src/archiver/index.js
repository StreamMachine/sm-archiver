var Archiver, Logger, Server, SlaveIO, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

SlaveIO = require("streammachine/js/src/streammachine/slave/slave_io");

Logger = require("streammachine/js/src/streammachine/logger");

Server = require("./server");

debug = require("debug")("sm:archiver");

module.exports = Archiver = (function(superClass) {
  extend(Archiver, superClass);

  function Archiver(options) {
    this.options = options;
    this.streams = {};
    this.stream_groups = {};
    this.root_route = null;
    this.connected = false;
    this._retrying = null;
    this.log = new Logger({
      stdout: true
    });
    this.io = new SlaveIO(this, this.log.child({
      module: "io"
    }), this.options.master);
    this.io.on("connected", (function(_this) {
      return function() {
        return debug("Connected to master.");
      };
    })(this));
    this.io.on("disconnected", (function(_this) {
      return function() {
        return debug("Disconnected from master.");
      };
    })(this));
    this.once("streams", (function(_this) {
      return function() {
        var k, ref, ref1, results, s;
        _this._configured = true;
        ref = _this.streams;
        results = [];
        for (k in ref) {
          s = ref[k];
          if (((ref1 = _this.options.streams) != null ? ref1.length : void 0) > 0 && _this.options.streams.indexOf(k) === -1) {
            continue;
          }
          results.push((function(k, s) {
            debug("Creating StreamArchiver for " + k);
            return s.archiver = new Archiver.StreamArchiver(s, _this.options);
          })(k, s));
        }
        return results;
      };
    })(this));
    this.server = new Server(this, this.options.port, this.log.child({
      component: "server"
    }));
  }

  Archiver.StreamArchiver = require("./stream");

  return Archiver;

})(require("streammachine/js/src/streammachine/slave"));

//# sourceMappingURL=index.js.map
