var MemoryStore, _, debug, moment;

_ = require("underscore");

moment = require("moment");

debug = require("debug")("sm:archiver:stores:memory");

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
    var first, from, last, segments, to;
    segments = [];
    first = _.first(this.index);
    last = _.last(this.index);
    from = options.from ? moment(options.from).valueOf() : first;
    to = options.to ? moment(options.to).valueOf() : last;
    if (from < first || to <= first) {
      return segments;
    }
    debug("Searching " + from + " -> " + to + " from " + this.stream.key);
    return _.values(_.pick(this.segments, _.filter(this.index, (function(_this) {
      return function(id) {
        return id >= from && id < to;
      };
    })(this))));
  };

  return MemoryStore;

})();

module.exports = MemoryStore;

//# sourceMappingURL=memory.js.map
