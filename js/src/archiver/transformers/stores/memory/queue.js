var QueueMemoryStoreTransformer, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

debug = require("debug")("sm:archiver:transformers:stores:memory:queue");

QueueMemoryStoreTransformer = (function(superClass) {
  extend(QueueMemoryStoreTransformer, superClass);

  function QueueMemoryStoreTransformer(stream, memory, options) {
    this.stream = stream;
    this.memory = memory;
    this.options = options;
    QueueMemoryStoreTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created for " + this.stream.key);
  }

  QueueMemoryStoreTransformer.prototype._transform = function(segment, encoding, callback) {
    if (this.memory.has(segment)) {
      debug("Skipping " + segment.id + " from " + this.stream.key);
    } else {
      debug("Segment " + segment.id + " from " + this.stream.key);
      this.memory.enqueue(segment);
      this.push(segment);
    }
    return callback();
  };

  return QueueMemoryStoreTransformer;

})(require("stream").Transform);

module.exports = QueueMemoryStoreTransformer;

//# sourceMappingURL=queue.js.map
