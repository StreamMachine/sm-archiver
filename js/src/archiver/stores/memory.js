var MemoryStore, _, debug,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require("underscore");

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
    return this.segments[id];
  };

  MemoryStore.prototype.getSegments = function(options) {
    var index, min, ref, ref1, segments;
    options = _.clone(options || {});
    options.from = ((ref = options.from) != null ? ref.valueOf() : void 0) || -1;
    options.to = ((ref1 = options.to) != null ? ref1.valueOf() : void 0) || Infinity;
    index = Object.keys(this.index);
    min = _.min(index);
    segments = [];
    if (options.to <= min) {
      return segments;
    }
    if (options.from !== -1 && options.from < min) {
      return segments;
    }
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

  MemoryStore.prototype.storeId = function(id) {
    if (!this.hasId(id)) {
      return this.ids.push(id);
    }
  };

  MemoryStore.prototype.storeSegment = function(segment) {
    var deletedId;
    if (this.hasId(segment.id)) {
      this.segments[segment.id] = segment;
      this.index[segment.moment.valueOf()] = segment.id;
      if (this.ids.length <= this.options.length) {
        return;
      }
      deletedId = this.ids.shift();
      delete this.index[this.segments[deletedId].moment.valueOf()];
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
    delete this.index[segment.moment.valueOf()];
    delete this.segments[id];
    return debug("Expired segment " + id);
  };

  return MemoryStore;

})();

//# sourceMappingURL=memory.js.map
