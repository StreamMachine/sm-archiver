var SegmentsMemoryStoreTransformer, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

debug = require("debug")("sm:archiver:transformers:stores:memory:segments");

module.exports = SegmentsMemoryStoreTransformer = (function(superClass) {
  extend(SegmentsMemoryStoreTransformer, superClass);

  function SegmentsMemoryStoreTransformer(memory, options) {
    this.memory = memory;
    this.options = options;
    SegmentsMemoryStoreTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created");
  }

  SegmentsMemoryStoreTransformer.prototype._transform = function(segment, encoding, callback) {
    debug("Segment " + segment.id);
    this.memory.storeSegment(segment);
    this.push(segment);
    return callback();
  };

  return SegmentsMemoryStoreTransformer;

})(require("stream").Transform);

//# sourceMappingURL=segments.js.map
