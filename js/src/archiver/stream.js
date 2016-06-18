var BufferTransformer, PreviewTransformer, S3Store, S3StoreTransformer, StreamArchiver, WaveformTransformer, _, debug, segmentKeys,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require("underscore");

BufferTransformer = require("./transformers/buffer");

WaveformTransformer = require("./transformers/waveform");

PreviewTransformer = require("./transformers/preview");

S3StoreTransformer = require("./transformers/s3");

S3Store = require("./stores/s3");

debug = require("debug")("sm:archiver:stream");

segmentKeys = ["id", "ts", "end_ts", "ts_actual", "end_ts_actual", "data_length", "duration", "discontinuitySeq", "pts", "preview"];

module.exports = StreamArchiver = (function(superClass) {
  extend(StreamArchiver, superClass);

  function StreamArchiver(stream, options) {
    var ref, ref1;
    this.stream = stream;
    this.options = options;
    this._getResampleOptions = bind(this._getResampleOptions, this);
    this.stores = {};
    this.segments = {};
    this.snapshot = null;
    this.transformers = [new BufferTransformer(this.stream), new WaveformTransformer(this.options.pixels_per_second)];
    if ((ref = this.options.stores) != null ? (ref1 = ref.s3) != null ? ref1.enabled : void 0 : void 0) {
      this.stores.s3 = new S3Store(this.stream, this.options.stores.s3);
      this.transformers.push(new S3StoreTransformer(this.stores.s3));
    }
    _.each(this.transformers, (function(_this) {
      return function(transformer, index) {
        var previous;
        previous = _this.transformers[index - 1];
        if (previous) {
          return previous.pipe(transformer);
        }
      };
    })(this));
    _.last(this.transformers).on("readable", (function(_this) {
      return function() {
        var results, seg;
        results = [];
        while (seg = _.last(_this.transformers).read()) {
          results.push(debug("Segment " + seg.id + " archived"));
        }
        return results;
      };
    })(this));
    this.stream.source.on("hls_snapshot", (function(_this) {
      return function(snapshot) {
        debug("HLS Snapshot received via broadcast from " + _this.stream.key);
        return _this.stream.emit("hls_snapshot", snapshot);
      };
    })(this));
    this.stream._once_source_loaded((function(_this) {
      return function() {
        return _this.stream.source.getHLSSnapshot(function(err, snapshot) {
          debug("HLS snapshot from initial source load of " + _this.stream.key);
          return _this.stream.emit("hls_snapshot", snapshot);
        });
      };
    })(this));
    this.stream.on("hls_snapshot", (function(_this) {
      return function(snapshot) {
        var i, id, j, len, len1, ref2, ref3, results, seg;
        debug("HLS Snapshot for " + _this.stream.key + " (" + snapshot.segments.length + " segments)");
        debug("Rewind extents are ", _this.stream._rbuffer.first(), _this.stream._rbuffer.last());
        _this.snapshot = snapshot;
        ref2 = _.difference(Object.keys(_this.segments), _.map(_this.snapshot.segments, function(s) {
          return s.id.toString();
        }));
        for (i = 0, len = ref2.length; i < len; i++) {
          id = ref2[i];
          debug("Expiring segment " + id + " from cache");
          delete _this.segments[id];
        }
        ref3 = _this.snapshot.segments;
        results = [];
        for (j = 0, len1 = ref3.length; j < len1; j++) {
          seg = ref3[j];
          if (!_this.segments[seg.id]) {
            _this.segments[seg.id] = seg;
            results.push(_.first(_this.transformers).write(seg));
          } else {
            results.push(void 0);
          }
        }
        return results;
      };
    })(this));
  }

  StreamArchiver.prototype.getPreview = function(cb) {
    var preview, previewTransformer, segments, snapshot;
    preview = [];
    snapshot = this.snapshot;
    segments = this.segments;
    if (!snapshot) {
      return cb(null, preview);
    }
    previewTransformer = new PreviewTransformer(this._getResampleOptions);
    previewTransformer.on("readable", (function(_this) {
      return function() {
        var results, segment;
        results = [];
        while (segment = previewTransformer.read()) {
          results.push(preview.push(_.pick(segment, segmentKeys)));
        }
        return results;
      };
    })(this));
    previewTransformer.on("end", (function(_this) {
      return function() {
        return cb(null, preview);
      };
    })(this));
    _.each(snapshot.segments, (function(_this) {
      return function(segment) {
        var ref;
        if ((ref = segments[segment.id]) != null ? ref.waveform : void 0) {
          return previewTransformer.write(segments[segment.id]);
        }
      };
    })(this));
    return previewTransformer.end();
  };

  StreamArchiver.prototype.getWaveform = function(id, cb) {
    var ref;
    if (!this.stores.s3) {
      if (!((ref = this.segments[id]) != null ? ref.waveform : void 0)) {
        return cb(null, this.segments[id].waveform);
      }
      return cb(new Error("Not found"));
    }
    return this.stores.s3.getSegmentById(id).then(function(segment) {
      return cb(null, segment.waveform);
    })["catch"](function() {
      return cb(new Error("Not found"));
    });
  };

  StreamArchiver.prototype._getResampleOptions = function(segment) {
    var pseg_width;
    pseg_width = Math.ceil(this.options.preview_width / this.snapshot.segments.length);
    if (pseg_width < segment.wavedata.adapter.scale) {
      return {
        scale: segment.wavedata.adapter.scale
      };
    }
    return {
      width: pseg_width
    };
  };

  return StreamArchiver;

})(require("events").EventEmitter);

//# sourceMappingURL=stream.js.map
