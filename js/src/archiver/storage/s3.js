var S3ArchiverStorage, debug;

debug = require("debug")("sm:archiver:storage:s3");

module.exports = S3ArchiverStorage = (function() {
  function S3ArchiverStorage(stream, options) {
    this.stream = stream;
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
            return s._archiver = new Archiver.StreamArchiver(s, _this.options);
          })(k, s));
        }
        return results;
      };
    })(this));
    this.server = new Server(this, this.options.port, this.log.child({
      component: "server"
    }));
  }

  S3ArchiverStorage.StreamArchiver = require("./stream_archiver");

  return S3ArchiverStorage;

})();

//# sourceMappingURL=s3.js.map
