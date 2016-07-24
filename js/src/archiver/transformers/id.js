var IdTransformer, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

debug = require("debug")("sm:archiver:transformers:id");

IdTransformer = (function(superClass) {
  extend(IdTransformer, superClass);

  function IdTransformer(stream) {
    this.stream = stream;
    IdTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created for " + this.stream.key);
  }

  IdTransformer.prototype._transform = function(segment, encoding, callback) {
    var id;
    id = segment.ts_actual.valueOf();
    debug("Segment " + segment.id + " -> " + id + " from " + this.stream.key);
    segment.id = id;
    this.push(segment);
    return callback();
  };

  return IdTransformer;

})(require("stream").Transform);

module.exports = IdTransformer;

//# sourceMappingURL=id.js.map
