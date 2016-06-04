var AWS, P, S3ArchiverStore, _, debug, moment,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

debug = require("debug")("sm:archiver:store:s3");

P = require("bluebird");

AWS = require("aws-sdk");

_ = require("underscore");

moment = require("moment");

module.exports = S3ArchiverStore = (function() {
  function S3ArchiverStore(stream, options) {
    this.stream = stream;
    this.options = options;
    this.storeSegment = bind(this.storeSegment, this);
    this.generateSection = bind(this.generateSection, this);
    this.storeIndexSection = bind(this.storeIndexSection, this);
    this.storeIndex = bind(this.storeIndex, this);
    this.storeFullIndex = bind(this.storeFullIndex, this);
    this.indexSegment = bind(this.indexSegment, this);
    this.generateIndex = bind(this.generateIndex, this);
    this.prefix = "sm-archiver/" + this.stream.key;
    this.s3 = new S3ArchiverStore.S3(this.options);
    this.stream.on("hls_snapshot", (function(_this) {
      return function(snapshot) {
        debug("HLS Snapshot for " + _this.stream.key + " (" + snapshot.segments.length + " segments of " + snapshot.segment_duration + " seconds)");
        return _this.generateIndex(snapshot).then(_this.storeFullIndex)["catch"](function(error) {
          return debug(error);
        });
      };
    })(this));
  }

  S3ArchiverStore.prototype.generateIndex = function(snapshot) {
    debug("Creating index for " + this.stream.key);
    return P.reduce(snapshot.segments, this.indexSegment, {});
  };

  S3ArchiverStore.prototype.indexSegment = function(index, segment) {
    var date, hour, minute, month, second, ts, year;
    ts = moment(segment.ts);
    year = String(ts.year());
    month = String(ts.month() + 1);
    date = String(ts.date());
    hour = String(ts.hour());
    minute = String(ts.minute());
    second = String(ts.second());
    index[year] = index[year] || {};
    index[year][month] = index[year][month] || {};
    index[year][month][date] = index[year][month][date] || {};
    index[year][month][date][hour] = index[year][month][date][hour] || {};
    index[year][month][date][hour][minute] = index[year][month][date][hour][minute] || {};
    index[year][month][date][hour][minute][second] = segment;
    return index;
  };

  S3ArchiverStore.prototype.storeFullIndex = function(index) {
    debug("Storing index for " + this.stream.key);
    return this.storeIndex(this.prefix, index);
  };

  S3ArchiverStore.prototype.storeIndex = function(prefix, index) {
    return P.each(Object.keys(index), (function(_this) {
      return function(key) {
        return _this.storeIndexSection(prefix, key, index);
      };
    })(this));
  };

  S3ArchiverStore.prototype.storeIndexSection = function(prefix, key, index) {
    var section;
    prefix = prefix + "/" + key;
    section = index[key];
    if (section.id) {
      return this.storeSegment(prefix, index[key]);
    }
    debug("Storing " + prefix + "/index.json");
    return this.s3.putObjectAsync({
      Key: prefix + "/index.json",
      Body: JSON.stringify(this.generateSection(section))
    }).then(this.storeIndex(prefix, index[key]));
  };

  S3ArchiverStore.prototype.generateSection = function(section) {
    return _.mapObject(section, (function(_this) {
      return function(subSection) {
        if (subSection.id) {
          return subSection.id;
        }
        return _this.generateSection(subSection);
      };
    })(this));
  };

  S3ArchiverStore.prototype.storeSegment = function(prefix, segment) {
    debug("Storing " + prefix + ".json");
    prefix = prefix + ".json";
    return this.s3.headObjectAsync({
      Key: prefix
    })["catch"]((function(_this) {
      return function(error) {
        if (error.statusCode === 404) {
          return _this.s3.putObjectAsync({
            Key: prefix,
            Body: JSON.stringify(segment)
          });
        }
        return P.resolve();
      };
    })(this));
  };

  S3ArchiverStore.S3 = (function() {
    function S3(options) {
      this.options = options;
      _.extend(this, new AWS.S3(this.options));
      P.promisifyAll(this);
    }

    return S3;

  })();

  return S3ArchiverStore;

})();

//# sourceMappingURL=s3.js.map
