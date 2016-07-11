var P, S3StoreTransformer, _, debug, moment,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

P = require("bluebird");

_ = require("underscore");

moment = require("moment");

debug = require("debug")("sm:archiver:transformers:stores:s3");

module.exports = S3StoreTransformer = (function(superClass) {
  extend(S3StoreTransformer, superClass);

  function S3StoreTransformer(s3) {
    this.s3 = s3;
    S3StoreTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created");
  }

  S3StoreTransformer.prototype._transform = function(segment, encoding, callback) {
    debug("Segment " + segment.id);
    return this.s3.putFileIfNotExists("audio/" + segment.id + "." + this.s3.format, segment.audio)["finally"]((function(_this) {
      return function() {
        _this.push(segment);
        return callback();
      };
    })(this));
  };

  return S3StoreTransformer;

})(require("stream").Transform);

//# sourceMappingURL=s3.js.map
