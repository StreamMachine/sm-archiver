var P, S3StoreTransformer, _, debug, moment, segmentKeys,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

P = require("bluebird");

_ = require("underscore");

moment = require("moment");

debug = require("debug")("sm:archiver:transformers:stores:s3");

segmentKeys = ["id", "ts", "end_ts", "ts_actual", "end_ts_actual", "data_length", "duration", "discontinuitySeq", "pts", "waveform"];

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
    return this.storeSegment(segment)["finally"]((function(_this) {
      return function() {
        _this.push(segment);
        return callback();
      };
    })(this));
  };

  S3StoreTransformer.prototype.storeSegment = function(segment) {
    var key;
    key = this.s3.getKey(segment);
    return P.all([
      this.s3.putFileIfNotExists("json/" + key + ".json", JSON.stringify(_.pick(segment, segmentKeys)), {
        ContentType: 'application/json'
      }), this.s3.putFileIfNotExists("audio/" + key + "." + this.s3.format, segment.audio), this.s3.putFileIfNotExists("index/segments/" + segment.id, key)
    ]);
  };

  return S3StoreTransformer;

})(require("stream").Transform);

//# sourceMappingURL=s3.js.map
