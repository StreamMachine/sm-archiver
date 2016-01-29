var ClipExporter, Server, compression, express;

express = require("express");

compression = require("compression");

ClipExporter = require("./clip_exporter");

module.exports = Server = (function() {
  function Server(core, port, log) {
    this.core = core;
    this.port = port;
    this.log = log;
    this.app = express();
    this.app.set("x-powered-by", "StreamMachine Archiver");
    this.app.use((function(_this) {
      return function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        return next();
      };
    })(this));
    this.app.param("stream", (function(_this) {
      return function(req, res, next, key) {
        var s;
        if ((key != null) && (s = _this.core.streams[key])) {
          req.stream = s;
          return next();
        } else {
          return res.status(404).end("Invalid stream.\n");
        }
      };
    })(this));
    this.app.get("/:stream.m3u8", compression({
      filter: function() {
        return true;
      }
    }), (function(_this) {
      return function(req, res) {
        return new _this.core.Outputs.live_streaming.Index(req.stream, {
          req: req,
          res: res
        });
      };
    })(this));
    this.app.get("/:stream/ts/:seg.(:format)", (function(_this) {
      return function(req, res) {
        return new _this.core.Outputs.live_streaming(req.stream, {
          req: req,
          res: res,
          format: req.param("format")
        });
      };
    })(this));
    this.app.get("/:stream/info", (function(_this) {
      return function(req, res) {
        var info, json;
        info = {
          format: req.stream.opts.format,
          codec: req.stream.opts.codec,
          archived: req.stream._archiver != null
        };
        json = JSON.stringify(info);
        res.writeHead(200, {
          "Content-type": "application/json",
          "Content-length": json.length
        });
        return res.end(json);
      };
    })(this));
    this.app.get("/:stream/preview", (function(_this) {
      return function(req, res) {
        return req.stream._archiver.getPreview(function(err, preview, json) {
          if (err) {
            return res.status(500).end("No preview available");
          } else {
            res.writeHead(200, {
              "Content-type": "application/json",
              "Content-length": json.length
            });
            return res.end(json);
          }
        });
      };
    })(this));
    this.app.get("/:stream/waveform/:seg", (function(_this) {
      return function(req, res) {
        return req.stream._archiver.getWaveform(req.params.seg, function(err, json) {
          if (err) {
            res.status(404).end("Waveform not found.");
            return false;
          }
          res.writeHead(200, {
            "Content-type": "application/json",
            "Content-length": json.length
          });
          return res.end(json);
        });
      };
    })(this));
    this.app.get("/:stream/export", (function(_this) {
      return function(req, res) {
        return new ClipExporter(req.stream, {
          req: req,
          res: res
        });
      };
    })(this));
    this._server = this.app.listen(this.port);
  }

  return Server;

})();

//# sourceMappingURL=server.js.map
