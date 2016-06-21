var P, S3Store, S3StoreTransformer, _, debug, moment, segmentKeys,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

P = require("bluebird");

_ = require("underscore");

moment = require("moment");

S3Store = require("../stores/s3");

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
    var date, hour, key, minute, month, second, ts, year;
    ts = moment(segment.ts);
    year = String(ts.year());
    month = String(ts.month() + 1);
    date = String(ts.date());
    hour = String(ts.hour());
    minute = String(ts.minute());
    second = String(ts.second());
    key = year + "/" + month + "/" + date + "/" + hour + "/" + minute + "/" + second;
    return P.all([
      this.s3.putFileIfNotExists(this.s3.prefix + "/" + key + ".json", JSON.stringify(_.pick(segment, segmentKeys)), {
        ContentType: 'application/json'
      }), this.s3.putFileIfNotExists(this.s3.prefix + "/" + key + "." + this.s3.format, segment.cbuf), this.s3.putFileIfNotExists(this.s3.prefix + "/index/segments/" + segment.id, key)
    ]);
  };

  return S3StoreTransformer;

})(require("stream").Transform);

//# sourceMappingURL=s3.js.map
