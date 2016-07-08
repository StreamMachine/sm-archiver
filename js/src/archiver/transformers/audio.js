var AudioTransformer, _, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require("underscore");

debug = require("debug")("sm:archiver:transformers:audio");

module.exports = AudioTransformer = (function(superClass) {
  extend(AudioTransformer, superClass);

  function AudioTransformer(stream) {
    this.stream = stream;
    AudioTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created");
  }

  AudioTransformer.prototype._transform = function(seg, encoding, cb) {
    var dur;
    debug("Segment " + seg.id);
    dur = this.stream.secsToOffset(seg.duration / 1000);
    return this.stream._rbuffer.range(seg.ts_actual, dur, (function(_this) {
      return function(err, chunks) {
        var audio, b, buffers, duration, i, len, length, meta;
        if (err) {
          console.error("Error getting segment rewind: " + err);
          cb();
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
        _this.push(_.extend(seg, {
          audio: audio,
          duration: duration,
          meta: meta
        }));
        return cb();
      };
    })(this));
  };

  return AudioTransformer;

})(require("stream").Transform);

//# sourceMappingURL=audio.js.map
