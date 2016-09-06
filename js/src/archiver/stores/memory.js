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

  MemoryStore.prototype.storeSegment = function(segment) {
    debug("Storing segment " + segment.id + " from " + this.stream.key);
    this.segments[segment.id] = segment;
    this.index.push(segment.id);
    delete this.queue[segment.id];
    if (this.index.length > this.options.size) {
      this.expire();
    }
    return debug(this.index.length + " segments in memory from " + this.stream.key);
  };

  MemoryStore.prototype.storeComment = function(comment) {
    debug("Storing comment " + comment.id + " from " + this.stream.key);
    if (!this.has({
      id: comment.id
    })) {
      return;
    }
    return this.segments[segment.id].comment = comment;
  };

  MemoryStore.prototype.expire = function() {
    var id;
    id = this.index.shift();
    delete this.segments[id];
    return debug("Expired segment " + id + " from " + this.stream.key);
  };

  MemoryStore.prototype.getSegment = function(id) {
    return this.getOne(id);
  };

  MemoryStore.prototype.getWaveform = function(id) {
    return this.getOne(id, "waveform");
  };

  MemoryStore.prototype.getAudio = function(id) {
    return this.getOne(id, "audio");
  };

  MemoryStore.prototype.getComment = function(id) {
    return this.getOne(id, "comment");
  };

  MemoryStore.prototype.getOne = function(id, attribute) {
    var ref;
    debug("Getting " + (attribute || "segment") + " " + id + " from " + this.stream.key);
    if (attribute) {
      return (ref = this.segments[id]) != null ? ref[attribute] : void 0;
    } else {
      return this.segments[id];
    }
  };

  MemoryStore.prototype.getSegments = function(options) {
    return this.getMany(options);
  };

  MemoryStore.prototype.getComments = function(options) {
    return this.getMany(options, "comment");
  };

  MemoryStore.prototype.getMany = function(options, attribute) {
    var first, from, last, segments, to;
    first = _.first(this.index);
    last = _.last(this.index);
    from = this.parseId(options.from, first);
    to = this.parseId(options.to, last);
    debug("Searching " + (attribute || "segment") + "s " + from + " -> " + to + " from " + this.stream.key);
    if (from < first || to <= first) {
      return [];
    }
    segments = _.values(_.pick(this.segments, _.filter(this.index, (function(_this) {
      return function(id) {
        return id >= from && id < to;
      };
    })(this))));
    if (attribute) {
      return _.pluck(segments, attribute);
    } else {
      return segments;
    }
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
