var ClipExporter, Server, compression, debug, express, moment;

moment = require("moment");

express = require("express");

compression = require("compression");

ClipExporter = require("./clip_exporter");

debug = require("debug")("sm:archiver:server");

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
        if (!req.stream.archiver) {
          return res.status(404).json({
            status: 404,
            error: "Stream not archived"
          });
        }
        return req.stream.archiver.getAudio(req.params.seg, req.params.format, function(err, audio) {
          if (err) {
            return res.status(404).json({
              status: 404,
              error: "Audio not found"
            });
          } else {
            res.type(req.params.format);
            return res.send(audio);
          }
        });
      };
    })(this));
    this.app.get("/:stream/info", (function(_this) {
      return function(req, res) {
        return res.json({
          format: req.stream.opts.format,
          codec: req.stream.opts.codec,
          archived: req.stream.archiver != null
        });
      };
    })(this));
    this.app.get("/:stream/preview", (function(_this) {
      return function(req, res) {
        var options;
        options = {};
        if (!req.stream.archiver) {
          return res.status(404).json({
            status: 404,
            error: "Stream not archived"
          });
        }
        if (req.query.from) {
          options.from = moment(req.query.from, req.query.format);
        }
        if (req.query.to) {
          options.to = moment(req.query.to, req.query.format);
        }
        return req.stream.archiver.getPreview(options, function(err, preview) {
          if (err) {
            return res.status(404).json({
              status: 404,
              error: "Preview not found"
            });
          } else {
            return res.json(preview);
          }
        });
      };
    })(this));
    this.app.get("/:stream/waveform/:seg", (function(_this) {
      return function(req, res) {
        if (!req.stream.archiver) {
          return res.status(404).json({
            status: 404,
            error: "Stream not archived"
          });
        }
        return req.stream.archiver.getWaveform(req.params.seg, function(err, waveform) {
          if (err) {
            return res.status(404).json({
              status: 404,
              error: "Waveform not found"
            });
          } else {
            return res.json(waveform);
          }
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
    this._server = this.app.listen(this.port, (function(_this) {
      return function() {
        return debug("Listing on port " + _this.port);
      };
    })(this));
    debug("Created");
  }

  return Server;

})();

//# sourceMappingURL=server.js.map
