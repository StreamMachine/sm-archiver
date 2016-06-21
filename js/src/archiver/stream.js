var BufferTransformer, PreviewTransformer, S3Store, S3StoreTransformer, StreamArchiver, WavedataTransformer, WaveformTransformer, _, debug, segmentKeys,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require("underscore");

BufferTransformer = require("./transformers/buffer");

WaveformTransformer = require("./transformers/waveform");

WavedataTransformer = require("./transformers/wavedata");

PreviewTransformer = require("./transformers/preview");

S3StoreTransformer = require("./transformers/s3");

S3Store = require("./stores/s3");

debug = require("debug")("sm:archiver:stream");

segmentKeys = ["id", "ts", "end_ts", "ts_actual", "end_ts_actual", "data_length", "duration", "discontinuitySeq", "pts", "preview"];

module.exports = StreamArchiver = (function(superClass) {
  extend(StreamArchiver, superClass);

  function StreamArchiver(stream, options1) {
    var ref, ref1;
    this.stream = stream;
    this.options = options1;
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
    debug("Created");
  }

  StreamArchiver.prototype.getPreview = function(options, cb) {
    var segments, snapshot;
    if (!this.snapshot) {
      return cb(null, []);
    }
    snapshot = _.map(this.snapshot.segments, (function(_this) {
      return function(segment) {
        return _this.segments[segment.id];
      };
    })(this));
    segments = _.filter(snapshot, (function(_this) {
      return function(segment) {
        return segment != null ? segment.waveform : void 0;
      };
    })(this));
    return this.generatePreview(segments, cb);
  };

  StreamArchiver.prototype.generatePreview = function(segments, cb) {
    var preview, previewTransformer, wavedataTransformer;
    preview = [];
    wavedataTransformer = new WavedataTransformer;
    previewTransformer = new PreviewTransformer(this.options.preview_width, segments.length);
    wavedataTransformer.pipe(previewTransformer);
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
    _.each(segments, (function(_this) {
      return function(segment) {
        return wavedataTransformer.write(segment);
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

  return StreamArchiver;

})(require("events").EventEmitter);

//# sourceMappingURL=stream.js.map
