var AudioTransformer, _, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require("underscore");

debug = require("debug")("sm:archiver:transformers:audio");

AudioTransformer = (function(superClass) {
  extend(AudioTransformer, superClass);

  function AudioTransformer(stream) {
    this.stream = stream;
    AudioTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created for " + this.stream.key);
  }

  AudioTransformer.prototype._transform = function(segment, encoding, callback) {
    var duration;
    duration = this.stream.secsToOffset(segment.duration / 1000);
    debug("Segment " + segment.id + " (" + duration + ") from " + this.stream.key);
    debug("Segment " + segment.id + ": " + segment.ts_actual);
    return this.stream._rbuffer.range(segment.ts_actual, duration, (function(_this) {
      return function(error, chunks) {
        var audio, b, buffers, i, len, length, meta;
        if (error) {
          console.error("Error getting segment rewind: " + error);
          callback();
          return false;
        }
        buffers = [];
        length = 0;
        duration = 0;
        meta = null;
        for (i = 0, len = chunks.length; i < len; i++) {
          b = chunks[i];
          length += b.data.length;
          duration += b.duration;
          buffers.push(b.data);
          if (!meta) {
            meta = b.meta;
          }
        }
        audio = Buffer.concat(buffers, length);
        debug(audio);
        _this.push(_.extend(segment, {
          audio: audio,
          duration: duration,
          meta: meta
        }));
        return callback();
      };
    })(this));
  };

  return AudioTransformer;

})(require("stream").Transform);

module.exports = AudioTransformer;

//# sourceMappingURL=audio.js.map
