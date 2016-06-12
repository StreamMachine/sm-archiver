var BufferTransformer, _,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require("underscore");

module.exports = BufferTransformer = (function(superClass) {
  extend(BufferTransformer, superClass);

  function BufferTransformer(stream) {
    this.stream = stream;
    BufferTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
  }

  BufferTransformer.prototype._transform = function(seg, encoding, cb) {
    var dur;
    dur = this.stream.secsToOffset(seg.duration / 1000);
    return this.stream._rbuffer.range(seg.ts_actual, dur, (function(_this) {
      return function(err, chunks) {
        var b, buffers, cbuf, duration, i, len, length, meta, obj;
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
        cbuf = Buffer.concat(buffers, length);
        obj = _.extend({}, seg, {
          cbuf: cbuf,
          duration: duration,
          meta: meta
        });
        _this.push(obj);
        return cb();
      };
    })(this));
  };

  return BufferTransformer;

})(require("stream").Transform);

//# sourceMappingURL=buffer.js.map
