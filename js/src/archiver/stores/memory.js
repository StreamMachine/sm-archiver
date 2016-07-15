var MemoryStore, _, debug, moment;

_ = require("underscore");

moment = require("moment");

debug = require("debug")("sm:archiver:stores:memory");

module.exports = MemoryStore = (function() {
  function MemoryStore(options1) {
    this.options = options1;
    this.queue = {};
    this.segments = {};
    this.index = [];
    debug("Created");
  }

  MemoryStore.prototype.has = function(segment) {
    return (this.queue[segment.id] != null) || (this.segments[segment.id] != null);
  };

  MemoryStore.prototype.enqueue = function(segment) {
    debug("Enqueuing " + segment.id);
    return this.queue[segment.id] = segment;
  };

  MemoryStore.prototype.store = function(segment) {
    debug("Storing " + segment.id);
    this.segments[segment.id] = segment;
    this.index.push(segment.id);
    delete this.queue[segment.id];
    if (this.index.length > this.options.size) {
      this.expire();
    }
    return debug(this.index.length + " segments in memory");
  };

  MemoryStore.prototype.expire = function() {
    var id;
    id = this.index.shift();
    delete this.segments[id];
    return debug("Expired segment " + id);
  };

  MemoryStore.prototype.getById = function(id) {
    debug("Getting " + id);
    return this.segments[id];
  };

  MemoryStore.prototype.get = function(options) {
    var segments;
    options = _.clone(options || {});
    options.from = options.from ? moment(options.from).valueOf() : -1;
    options.to = options.to ? moment(options.to).valueOf() : Infinity;
    segments = [];
    if (options.to <= this.index[0]) {
      return segments;
    }
    if (options.from !== -1 && options.from < this.index[0]) {
      return segments;
    }
    debug("Searching from " + options.from + " to " + options.to);
    return _.values(_.pick(this.segments, _.filter(this.index, (function(_this) {
      return function(id) {
        return id >= options.from && id < options.to;
      };
    })(this))));
  };

  return MemoryStore;

})();

//# sourceMappingURL=memory.js.map
