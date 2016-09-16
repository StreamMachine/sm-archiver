var Archiver, Logger, Server, SlaveIO, StreamArchiver, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

SlaveIO = require("streammachine/js/src/streammachine/slave/slave_io");

Logger = require("streammachine/js/src/streammachine/logger");

StreamArchiver = require("./stream");

Server = require("./server");

debug = require("debug")("sm:archiver");

Archiver = (function(superClass) {
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
        return debug("Connected to master");
      };
    })(this));
    this.io.on("disconnected", (function(_this) {
      return function() {
        return debug("Disconnected from master");
      };
    })(this));
    this.once("streams", (function(_this) {
      return function() {
        var key, ref, ref1, results, stream;
        _this._configured = true;
        ref = _this.streams;
        results = [];
        for (key in ref) {
          stream = ref[key];
          if (((ref1 = _this.options.streams) != null ? ref1.length : void 0) > 0 && _this.options.streams.indexOf(key) === -1) {
            continue;
          }
          results.push((function(key, stream) {
            debug("Creating StreamArchiver for " + key);
            return stream.archiver = new StreamArchiver(stream, _this.options);
          })(key, stream));
        }
        return results;
      };
    })(this));
    this.server = new Server(this, this.options, this.log.child({
      component: "server"
    }));
    debug("Created");
  }

  return Archiver;

})(require("streammachine/js/src/streammachine/slave"));

module.exports = Archiver;

//# sourceMappingURL=index.js.map
