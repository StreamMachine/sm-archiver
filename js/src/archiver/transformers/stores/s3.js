var S3StoreTransformer, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

debug = require("debug")("sm:archiver:transformers:s3");

S3StoreTransformer = (function(superClass) {
  extend(S3StoreTransformer, superClass);

  function S3StoreTransformer(stream, s3) {
    this.stream = stream;
    this.s3 = s3;
    S3StoreTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created for " + this.stream.key);
  }

  S3StoreTransformer.prototype._transform = function(segment, encoding, callback) {
    debug("Segment " + segment.id + " from " + this.stream.key);
    return this.s3.putFileIfNotExists("audio/" + segment.id + "." + this.s3.format, segment.audio)["finally"]((function(_this) {
      return function() {
        _this.push(segment);
        return callback();
      };
    })(this));
  };

  return S3StoreTransformer;

})(require("stream").Transform);

module.exports = S3StoreTransformer;

//# sourceMappingURL=s3.js.map
