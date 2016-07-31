var MemoryStore, R_TIMESTAMP, _, debug, moment;

_ = require("underscore");

moment = require("moment");

debug = require("debug")("sm:archiver:stores:memory");

R_TIMESTAMP = /^[1-9][0-9]*$/;

MemoryStore = (function() {
  function MemoryStore(stream, options1) {
    this.stream = stream;
    this.options = options1;
    this.queue = {};
    this.segments = {};
    this.index = [];
    debug("Created for " + this.stream.key);
  }

  MemoryStore.prototype.has = function(segment) {
    return (this.queue[segment.id] != null) || (this.segments[segment.id] != null);
  };

  MemoryStore.prototype.enqueue = function(segment) {
    debug("Enqueuing " + segment.id + " from " + this.stream.key);
    return this.queue[segment.id] = segment;
  };

  MemoryStore.prototype.store = function(segment) {
    debug("Storing " + segment.id + " from " + this.stream.key);
    this.segments[segment.id] = segment;
    this.index.push(segment.id);
    delete this.queue[segment.id];
    if (this.index.length > this.options.size) {
      this.expire();
    }
    return debug(this.index.length + " segments in memory from " + this.stream.key);
  };

  MemoryStore.prototype.expire = function() {
    var id;
    id = this.index.shift();
    delete this.segments[id];
    return debug("Expired segment " + id + " from " + this.stream.key);
  };

  MemoryStore.prototype.getById = function(id) {
    debug("Getting " + id + " from " + this.stream.key);
    return this.segments[id];
  };

  MemoryStore.prototype.get = function(options) {
    var first, from, last, to;
    first = _.first(this.index);
    last = _.last(this.index);
    from = this.parseId(options.from, first);
    to = this.parseId(options.to, last);
    debug("Searching " + from + " -> " + to + " from " + this.stream.key);
    if (from < first || to <= first) {
      return [];
    }
    return _.values(_.pick(this.segments, _.filter(this.index, (function(_this) {
      return function(id) {
        return id >= from && id < to;
      };
    })(this))));
  };

  MemoryStore.prototype.parseId = function(id, defaultId) {
    if (!id) {
      return defaultId;
    }
    if (R_TIMESTAMP.test(id)) {
      return Number(id);
    }
    return moment(id).valueOf();
  };

  return MemoryStore;

})();

module.exports = MemoryStore;

//# sourceMappingURL=memory.js.map
