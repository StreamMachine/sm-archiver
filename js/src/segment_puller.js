var SegmentPuller, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require("underscore");

module.exports = SegmentPuller = (function(_super) {
  __extends(SegmentPuller, _super);

  function SegmentPuller(stream) {
    this.stream = stream;
    SegmentPuller.__super__.constructor.call(this, {
      objectMode: true
    });
  }

  SegmentPuller.prototype._transform = function(seg, encoding, cb) {
    var dur;
    dur = this.stream.secsToOffset(seg.duration / 1000);
    return this.stream._rbuffer.range(seg.ts_actual, dur, (function(_this) {
      return function(err, chunks) {
        var b, buffers, cbuf, duration, length, meta, obj, _i, _len;
        if (err) {
          console.error("Error getting segment rewind: " + err);
          cb();
          return false;
        }
        buffers = [];
        length = 0;
        duration = 0;
        meta = null;
        for (_i = 0, _len = chunks.length; _i < _len; _i++) {
          b = chunks[_i];
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

  return SegmentPuller;

})(require("stream").Transform);

//# sourceMappingURL=segment_puller.js.map
