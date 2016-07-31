var ElasticsearchStore, P, R_TIMESTAMP, _, debug, elasticsearch, moment, segmentKeys;

P = require("bluebird");

_ = require("underscore");

moment = require("moment");

elasticsearch = require("elasticsearch");

debug = require("debug")("sm:archiver:stores:elasticsearch");

R_TIMESTAMP = /^[1-9][0-9]*$/;

segmentKeys = ["id", "ts", "end_ts", "ts_actual", "end_ts_actual", "data_length", "duration", "discontinuitySeq", "pts", "waveform"];

ElasticsearchStore = (function() {
  function ElasticsearchStore(stream, options) {
    this.stream = stream;
    this.options = _.clone(options);
    _.extend(this, new elasticsearch.Client(this.options));
    this.hours = this.options.size / 60 / 6;
    debug("Created for " + this.stream.key);
  }

  ElasticsearchStore.prototype.indexSegment = function(segment) {
    debug("Indexing " + segment.id + " from " + this.stream.key);
    return this.index({
      index: this.stream.key,
      type: "segment",
      id: segment.id,
      body: _.pick(segment, segmentKeys)
    })["catch"]((function(_this) {
      return function(error) {
        return debug("INDEX Error for " + _this.stream.key + "/" + segment.id + ": " + error);
      };
    })(this));
  };

  ElasticsearchStore.prototype.getSegmentById = function(id, fields) {
    debug("Getting " + id + " from " + this.stream.key);
    return this.get({
      index: this.stream.key,
      type: "segment",
      id: id,
      fields: fields
    }).then((function(_this) {
      return function(result) {
        return result._source;
      };
    })(this))["catch"]((function(_this) {
      return function(error) {
        return debug("GET Error for " + _this.stream.key + "/" + id + ": " + error);
      };
    })(this));
  };

  ElasticsearchStore.prototype.getSegments = function(options) {
    var first, from, last, to;
    first = moment().subtract(this.hours, 'hours').valueOf();
    last = moment().valueOf();
    from = this.parseId(options.from, first);
    to = this.parseId(options.to, last);
    debug("Searching " + from + " -> " + to + " from " + this.stream.key);
    return this.search({
      index: this.stream.key,
      type: "segment",
      body: {
        size: this.options.size,
        sort: "id",
        query: {
          range: {
            id: {
              gte: from,
              lt: to
            }
          }
        }
      }
    }).then((function(_this) {
      return function(result) {
        return P.map(result.hits.hits, function(hit) {
          return hit._source;
        });
      };
    })(this))["catch"]((function(_this) {
      return function(error) {
        return debug("SEARCH Error for " + _this.stream.key + ": " + error);
      };
    })(this));
  };

  ElasticsearchStore.prototype.parseId = function(id, defaultId) {
    if (!id) {
      return defaultId;
    }
    if (R_TIMESTAMP.test(id)) {
      return Number(id);
    }
    return moment(id).valueOf();
  };

  return ElasticsearchStore;

})();

module.exports = ElasticsearchStore;

//# sourceMappingURL=elasticsearch.js.map
