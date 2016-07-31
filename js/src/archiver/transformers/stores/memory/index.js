var MemoryStoreTransformer, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

debug = require("debug")("sm:archiver:transformers:memory");

MemoryStoreTransformer = (function(superClass) {
  extend(MemoryStoreTransformer, superClass);

  function MemoryStoreTransformer(stream, memory, options) {
    this.stream = stream;
    this.memory = memory;
    this.options = options;
    MemoryStoreTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created for " + this.stream.key);
  }

  MemoryStoreTransformer.prototype._transform = function(segment, encoding, callback) {
    debug("Segment " + segment.id + " from " + this.stream.key);
    this.memory.store(segment);
    this.push(segment);
    return callback();
  };

  return MemoryStoreTransformer;

})(require("stream").Transform);

module.exports = MemoryStoreTransformer;

//# sourceMappingURL=index.js.map
