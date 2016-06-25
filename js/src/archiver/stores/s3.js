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

  S3Store.prototype.getSegmentById = function(id) {
    return this.getFile("index/segments/" + id).then((function(_this) {
      return function(data) {
        return _this.getSegment(data.Body);
      };
    })(this));
  };

  S3Store.prototype.getSegment = function(key) {
    return this.getFile("json/" + key + ".json").then((function(_this) {
      return function(data) {
        return JSON.parse(data.Body);
      };
    })(this));
  };

  S3Store.prototype.getSegments = function(options) {
    options = _.clone(options || {});
    options.type = options.type || "json";
    if (!options.from || !options.to) {
      return P.resolve([]);
    }
    return this.getFiles(options.type + "/" + (this.getCommonKey(options)));
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

  S3Store.prototype.getFiles = function(key) {
    key = this.prefix + "/" + key;
    debug("Listing " + key);
    return this.listObjectsV2Async({
      Prefix: "" + key
    })["catch"]((function(_this) {
      return function(error) {
        debug("LIST Error for " + key + ": " + error);
        throw error;
      };
    })(this)).then((function(_this) {
      return function(data) {
        return data.Contents;
      };
    })(this)).map((function(_this) {
      return function(file) {
        return _this.getObjectAsync({
          Key: file.Key
        });
      };
    })(this)).map((function(_this) {
      return function(file) {
        return JSON.parse(file.Body);
      };
    })(this))["catch"]((function(_this) {
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
    })["catch"]((function(_this) {
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

  S3Store.prototype.getKey = function(segment) {
    var date, hour, minute, month, second, year;
    year = String(segment.moment.year());
    month = String(segment.moment.month() + 1);
    date = String(segment.moment.date());
    hour = String(segment.moment.hour());
    minute = String(segment.moment.minute());
    second = String(segment.moment.second());
    return year + "/" + month + "/" + date + "/" + hour + "/" + minute + "/" + second;
  };

  S3Store.prototype.getCommonKey = function(options) {
    var date, hour, key, minute, month, year;
    key = "";
    year = options.from.year();
    month = options.from.month() + 1;
    date = options.from.date();
    hour = options.from.hour();
    minute = options.from.minute();
    if (year !== options.to.year()) {
      return key;
    }
    key += year + "/";
    if (month !== (options.to.month() + 1)) {
      return key;
    }
    key += month + "/";
    if (date !== options.to.date()) {
      return key;
    }
    key += date + "/";
    if (hour !== options.to.hour()) {
      return key;
    }
    key += hour + "/";
    if (minute !== options.to.minute()) {
      return key;
    }
    return key += minute + "/";
  };

  return S3Store;

})();

//# sourceMappingURL=s3.js.map
