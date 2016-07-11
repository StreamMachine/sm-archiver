var MemoryStore, _, debug, moment,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require("underscore");

moment = require("moment");

debug = require("debug")("sm:archiver:stores:memory");

module.exports = MemoryStore = (function() {
  function MemoryStore(options1) {
    this.options = options1;
    this._reduce = bind(this._reduce, this);
    this.ids = [];
    this.index = {};
    this.segments = {};
    debug("Created");
  }

  MemoryStore.prototype.hasId = function(id) {
    return indexOf.call(this.ids, id) >= 0;
  };

  MemoryStore.prototype.getSegmentById = function(id) {
    debug("Getting " + id);
    return this.segments[id];
  };

  MemoryStore.prototype.storeId = function(id) {
    if (this.hasId(id)) {
      return false;
    }
    this.ids.push(id);
    return true;
  };

  MemoryStore.prototype.getSegments = function(options) {
    var index, min, segments;
    options = _.clone(options || {});
    options.from = options.from ? moment(options.from).valueOf() : -1;
    options.to = options.to ? moment(options.to).valueOf() : Infinity;
    index = Object.keys(this.index);
    min = _.min(index);
    segments = [];
    if (options.to <= min) {
      return segments;
    }
    if (options.from !== -1 && options.from < min) {
      return segments;
    }
    debug("Searching from " + options.from + " to " + options.to);
    return index.sort().reduce(((function(_this) {
      return function(segments, moment) {
        return _this._reduce(segments, moment, options);
      };
    })(this)), segments);
  };

  MemoryStore.prototype._reduce = function(segments, moment, options) {
    if (moment >= options.from && moment <= options.to) {
      segments.push(this.segments[this.index[moment]]);
    }
    return segments;
  };

  MemoryStore.prototype.storeSegment = function(segment) {
    var deletedId;
    if (this.hasId(segment.id)) {
      this.segments[segment.id] = segment;
      debug(moment(segment.ts).valueOf());
      this.index[moment(segment.ts).valueOf()] = segment.id;
      debug((Object.keys(this.segments).length) + " " + this.options.size);
      if (Object.keys(this.segments).length <= this.options.size) {
        return;
      }
      deletedId = this.ids.shift();
      debug(deletedId + " " + (this.segments[deletedId] != null));
      if (!this.segments[deletedId]) {
        return;
      }
      debug(moment(this.segments[deletedId].ts).valueOf());
      delete this.index[moment(this.segments[deletedId].ts).valueOf()];
      delete this.segments[deletedId];
      return debug("Expired segment " + deletedId);
    }
  };

  MemoryStore.prototype.deleteSegment = function(id) {
    var segment;
    segment = this.segments[id];
    if (!segment) {
      return;
    }
    delete this.index[segment.ts.valueOf()];
    delete this.segments[id];
    return debug("Expired segment " + id);
  };

  return MemoryStore;

})();

//# sourceMappingURL=memory.js.map
