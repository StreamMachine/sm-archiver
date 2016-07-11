var AWS, P, S3Store, _, debug, moment;

P = require("bluebird");

AWS = require("aws-sdk");

_ = require("underscore");

moment = require("moment");

debug = require("debug")("sm:archiver:stores:s3");

module.exports = S3Store = (function() {
  function S3Store(stream, options1) {
    this.stream = stream;
    this.options = options1;
    _.extend(this, new AWS.S3(this.options));
    P.promisifyAll(this);
    this.prefix = "sm-archiver/" + this.stream.key;
    this.format = this.stream.opts.format;
    debug("Created");
  }

  S3Store.prototype.getAudioById = function(id, format) {
    if (format !== this.format) {
      return P.resolve();
    }
    return this.getFile("audio/" + id + "." + format).then((function(_this) {
      return function(data) {
        return data.Body;
      };
    })(this));
  };

  S3Store.prototype.getFile = function(key) {
    key = this.prefix + "/" + key;
    debug("Getting " + key);
    return this.getObjectAsync({
      Key: key
    })["catch"]((function(_this) {
      return function(error) {
        debug("GET Error for " + key + ": " + error);
        throw error;
      };
    })(this));
  };

  S3Store.prototype.putFileIfNotExists = function(key, body, options) {
    key = this.prefix + "/" + key;
    return this.headObjectAsync({
      Key: key
    }).then((function(_this) {
      return function() {
        return debug("Skipping " + key);
      };
    })(this))["catch"]((function(_this) {
      return function(error) {
        if (error.statusCode === 404) {
          debug("Storing " + key);
          return _this.putObjectAsync(_.extend({}, options || {}, {
            Key: key,
            Body: body
          }))["catch"](function(error) {
            return debug("PUT Error for " + key + ": " + error);
          });
        }
        return debug("HEAD Error for " + key + ": " + error);
      };
    })(this));
  };

  return S3Store;

})();

//# sourceMappingURL=s3.js.map
