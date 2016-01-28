var ClipExporter, Parsers, debug, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

debug = require("debug")("sm-archiver");

_ = require("underscore");

Parsers = {
  aac: require("streammachine/js/src/streammachine/parsers/aac"),
  mp3: require("streammachine/js/src/streammachine/parsers/mp3")
};

module.exports = ClipExporter = (function() {
  function ClipExporter(stream, opts) {
    var end_offset, end_time, start_offset, start_time;
    this.stream = stream;
    this.opts = opts;
    start_time = new Date(this.opts.req.query.start);
    end_time = new Date(this.opts.req.query.end);
    start_offset = this.stream._rbuffer._findTimestampOffset(start_time);
    end_offset = this.stream._rbuffer._findTimestampOffset(end_time);
    debug("Start/End offsets are " + start_offset + "/" + end_offset, start_time.toISOString(), end_time.toISOString());
    this.stream._rbuffer.range(start_offset, (start_offset - end_offset) + 1, (function(_this) {
      return function(err, chunks) {
        var aF, trim_end, trim_start;
        if (err) {
          _this.opts.res.status(500).end(err);
          return false;
        }
        debug("chunks length is " + chunks.length);
        trim_start = Number(start_time) - Number(chunks[0].ts);
        trim_end = Number(chunks[chunks.length - 1].ts) + chunks[chunks.length - 1].duration - Number(end_time);
        debug("Start/end trims are " + trim_start + " / " + trim_end, chunks[0].ts.toISOString(), chunks[chunks.length - 1].ts.toISOString(), chunks[chunks.length - 1].duration);
        aF = _.after(2, function() {
          var c, content_length, _i, _len;
          debug("Chunk trimming complete.");
          content_length = 0;
          for (_i = 0, _len = chunks.length; _i < _len; _i++) {
            c = chunks[_i];
            content_length += c.data.length;
          }
          _this.opts.res.writeHead(200, {
            "Content-Type": _this.stream.opts.format === "mp3" ? "audio/mpeg" : _this.stream.opts.format === "aac" ? "audio/aacp" : "unknown",
            "Connection": "close",
            "Content-Length": content_length,
            "Content-Disposition": 'attachment; filename="kpcc-clip.' + _this.stream.opts.format + '"'
          });
          stream = new ClipExporter.ChunkStream(chunks);
          return stream.pipe(_this.opts.res);
        });
        _this.trim(chunks[0], trim_start, function(err, c) {
          debug("After trimming, chunk[0] is " + c.data.length);
          if (!err) {
            chunks[0] = c;
          }
          return aF();
        });
        return _this.trim(chunks[chunks.length - 1], -1 * trim_end, function(err, c) {
          debug("After trimming, chunk[-1] is " + c.data.length);
          if (!err) {
            chunks[chunks.length - 1] = c;
          }
          return aF();
        });
      };
    })(this));
  }

  ClipExporter.prototype.trim = function(chunk, amount, cb) {
    var bufDuration, bufLen, bufs, new_ts, parser, skippedBytes, skippedDuration, targetDuration, writing;
    skippedBytes = 0;
    skippedDuration = 0;
    bufs = [];
    bufLen = 0;
    new_ts = null;
    if (amount === 0) {
      cb(null, chunk);
      return false;
    }
    parser = new Parsers[this.stream.opts.format];
    if (amount > 0) {
      writing = false;
      parser.on("frame", (function(_this) {
        return function(frame, header) {
          if (writing) {
            bufs.push(frame);
            return bufLen += frame.length;
          } else {
            if (skippedDuration + header.duration > amount) {
              writing = true;
              bufs.push(frame);
              bufLen += frame.length;
              return new_ts = new Date(Number(chunk.ts) + skippedDuration);
            } else {
              skippedBytes += frame.length;
              return skippedDuration += header.duration;
            }
          }
        };
      })(this));
    }
    if (amount < 0) {
      targetDuration = chunk.duration + amount;
      bufDuration = 0;
      new_ts = chunk.ts;
      parser.on("frame", (function(_this) {
        return function(frame, header) {
          if (bufDuration > targetDuration) {
            skippedDuration += header.duration;
            return skippedBytes += frame.length;
          } else {
            bufs.push(frame);
            bufLen += frame.length;
            return bufDuration += header.duration;
          }
        };
      })(this));
    }
    parser.on("end", (function(_this) {
      return function() {
        var buf, new_chunk;
        buf = Buffer.concat(bufs, bufLen);
        debug("Trim skipped " + skippedBytes + " bytes and " + skippedDuration + "ms");
        new_chunk = {
          ts: new_ts,
          duration: chunk.duration - skippedDuration,
          data: buf
        };
        return cb(null, new_chunk);
      };
    })(this));
    return parser.end(chunk.data);
  };

  ClipExporter.ChunkStream = (function(_super) {
    __extends(ChunkStream, _super);

    function ChunkStream(data) {
      this.data = data;
      this.pos = 0;
      this.sentBytes = 0;
      ChunkStream.__super__.constructor.call(this);
    }

    ChunkStream.prototype._read = function(size) {
      var sent, _pushQueue;
      sent = 0;
      _pushQueue = (function(_this) {
        return function() {
          var chunk;
          if (_this.pos === _this.data.length) {
            _this.push(null);
            return false;
          }
          chunk = _this.data[_this.pos];
          _this.pos += 1;
          sent += chunk.data.length;
          _this.sentBytes += chunk.data.length;
          if (_this.push(chunk.data)) {
            if (sent < size) {
              return _pushQueue();
            }
          } else {
            return _this.emit("readable");
          }
        };
      })(this);
      return _pushQueue();
    };

    return ChunkStream;

  })(require("stream").Readable);

  return ClipExporter;

})();

//# sourceMappingURL=clip_exporter.js.map
