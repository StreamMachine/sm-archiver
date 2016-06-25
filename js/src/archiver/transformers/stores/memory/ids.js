var IdsMemoryStoreTransformer, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

debug = require("debug")("sm:archiver:transformers:stores:memory:ids");

module.exports = IdsMemoryStoreTransformer = (function(superClass) {
  extend(IdsMemoryStoreTransformer, superClass);

  function IdsMemoryStoreTransformer(memory, options) {
    this.memory = memory;
    this.options = options;
    IdsMemoryStoreTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created");
  }

  IdsMemoryStoreTransformer.prototype._transform = function(segment, encoding, callback) {
    debug("Segment " + segment.id);
    this.memory.storeId(segment.id);
    this.push(segment);
    return callback();
  };

  return IdsMemoryStoreTransformer;

})(require("stream").Transform);

//# sourceMappingURL=ids.js.map
