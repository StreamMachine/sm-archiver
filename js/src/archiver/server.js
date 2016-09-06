var ClipExporter, Server, bodyParser, compression, cors, debug, express, moment;

cors = require("cors");

moment = require("moment");

express = require("express");

bodyParser = require("body-parser");

compression = require("compression");

ClipExporter = require("./clip_exporter");

debug = require("debug")("sm:archiver:server");

Server = (function() {
  function Server(core, port, log) {
    this.core = core;
    this.port = port;
    this.log = log;
    this.app = express();
    this.app.set("x-powered-by", "StreamMachine Archiver");
    this.app.use(cors({
      exposedHeaders: ["X-Archiver-Preview-Length", "X-Archiver-Filename"]
    }));
    this.app.options("*", cors());
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
    this.app.get("/:stream/ts/:segment.(:format)", (function(_this) {
      return function(req, res) {
        if (!req.stream.archiver) {
          return res.status(404).json({
            status: 404,
            error: "Stream not archived"
          });
        }
        return req.stream.archiver.getAudio(req.params.segment, req.params.format, function(error, audio) {
          if (error) {
            return res.status(500).json({
              status: 500,
              error: error
            });
          } else if (!audio) {
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
        if (!req.stream.archiver) {
          return res.status(404).json({
            status: 404,
            error: "Stream not archived"
          });
        }
        return req.stream.archiver.getPreview(req.query, function(error, preview) {
          if (error) {
            return res.status(500).json({
              status: 500,
              error: error
            });
          } else if (!preview) {
            return res.status(404).json({
              status: 404,
              error: "Preview not found"
            });
          } else {
            res.set("X-Archiver-Preview-Length", preview.length);
            return res.json(preview);
          }
        });
      };
    })(this));
    this.app.get("/:stream/segments/:segment", (function(_this) {
      return function(req, res) {
        if (!req.stream.archiver) {
          return res.status(404).json({
            status: 404,
            error: "Stream not archived"
          });
        }
        return req.stream.archiver.getSegment(req.params.segment, function(error, segment) {
          if (error) {
            return res.status(500).json({
              status: 500,
              error: error
            });
          } else if (!segment) {
            return res.status(404).json({
              status: 404,
              error: "Segment not found"
            });
          } else {
            return res.json(segment);
          }
        });
      };
    })(this));
    this.app.get("/:stream/waveform/:segment", (function(_this) {
      return function(req, res) {
        if (!req.stream.archiver) {
          return res.status(404).json({
            status: 404,
            error: "Stream not archived"
          });
        }
        return req.stream.archiver.getWaveform(req.params.segment, function(error, waveform) {
          if (error) {
            return res.status(500).json({
              status: 500,
              error: error
            });
          } else if (!waveform) {
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
    this.app.post("/:stream/comments", bodyParser.json(), (function(_this) {
      return function(req, res) {
        if (!req.stream.archiver) {
          return res.status(404).json({
            status: 404,
            error: "Stream not archived"
          });
        }
        return req.stream.archiver.saveComment(req.body, function(error, comment) {
          if (error) {
            return res.status(500).json({
              status: 500,
              error: error
            });
          } else {
            return res.json(comment);
          }
        });
      };
    })(this));
    this.app.get("/:stream/comments/:comment", (function(_this) {
      return function(req, res) {
        if (!req.stream.archiver) {
          return res.status(404).json({
            status: 404,
            error: "Stream not archived"
          });
        }
        return req.stream.archiver.getComment(req.params.comment, function(error, comment) {
          if (error) {
            return res.status(500).json({
              status: 500,
              error: error
            });
          } else if (!comment) {
            return res.status(404).json({
              status: 404,
              error: "Comment not found"
            });
          } else {
            return res.json(comment);
          }
        });
      };
    })(this));
    this.app.get("/:stream/comments", (function(_this) {
      return function(req, res) {
        if (!req.stream.archiver) {
          return res.status(404).json({
            status: 404,
            error: "Stream not archived"
          });
        }
        return req.stream.archiver.getComments(req.query, function(error, comments) {
          if (error) {
            return res.status(500).json({
              status: 500,
              error: error
            });
          } else if (!comments) {
            return res.status(404).json({
              status: 404,
              error: "Comments not found"
            });
          } else {
            res.set("X-Archiver-Comments-Length", comments.length);
            return res.json(comments);
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

module.exports = Server;

//# sourceMappingURL=server.js.map
