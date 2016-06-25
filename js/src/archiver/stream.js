var BufferTransformer, IdsMemoryStoreTransformer, MemoryStore, MomentTransformer, PreviewTransformer, S3Store, S3StoreTransformer, SegmentsMemoryStoreTransformer, StreamArchiver, WavedataTransformer, WaveformTransformer, _, debug, segmentKeys,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require("underscore");

BufferTransformer = require("./transformers/buffer");

WaveformTransformer = require("./transformers/waveform");

MomentTransformer = require("./transformers/moment");

WavedataTransformer = require("./transformers/wavedata");

PreviewTransformer = require("./transformers/preview");

S3Store = require("./stores/s3");

S3StoreTransformer = require("./transformers/stores/s3");

MemoryStore = require("./stores/memory");

IdsMemoryStoreTransformer = require("./transformers/stores/memory/ids");

SegmentsMemoryStoreTransformer = require("./transformers/stores/memory/segments");

debug = require("debug")("sm:archiver:stream");

segmentKeys = ["id", "ts", "end_ts", "ts_actual", "end_ts_actual", "data_length", "duration", "discontinuitySeq", "pts", "preview"];

module.exports = StreamArchiver = (function(superClass) {
  extend(StreamArchiver, superClass);

  function StreamArchiver(stream, options1) {
    var ref, ref1, ref2, ref3;
    this.stream = stream;
    this.options = options1;
    this.stores = {};
    this.snapshot = null;
    this.transformers = [new BufferTransformer(this.stream), new WaveformTransformer(this.options.pixels_per_second), new MomentTransformer()];
    if ((ref = this.options.stores) != null ? (ref1 = ref.s3) != null ? ref1.enabled : void 0 : void 0) {
      this.stores.s3 = new S3Store(this.stream, this.options.stores.s3);
      this.transformers.push(new S3StoreTransformer(this.stores.s3));
    }
    if ((ref2 = this.options.stores) != null ? (ref3 = ref2.memory) != null ? ref3.enabled : void 0 : void 0) {
      this.stores.memory = new MemoryStore(this.options.stores.memory);
      this.transformers.unshift(new IdsMemoryStoreTransformer(this.stores.memory));
      this.transformers.push(new SegmentsMemoryStoreTransformer(this.stores.memory));
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
        var i, len, ref4, ref5, results, segment;
        debug("HLS Snapshot for " + _this.stream.key + " (" + snapshot.segments.length + " segments)");
        debug("Rewind extents are ", _this.stream._rbuffer.first(), _this.stream._rbuffer.last());
        _this.snapshot = snapshot;
        ref4 = _this.snapshot.segments;
        results = [];
        for (i = 0, len = ref4.length; i < len; i++) {
          segment = ref4[i];
          if (!((ref5 = _this.stores.memory) != null ? ref5.hasId(segment.id) : void 0)) {
            results.push(_.first(_this.transformers).write(segment));
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
    return this.getPreviewFromMemory(options, (function(_this) {
      return function(err, preview) {
        if (err || (preview && preview.length)) {
          return cb(err, preview);
        }
        return _this.getPreviewFromS3(options, function(err, preview) {
          if (err || (preview && preview.length)) {
            return cb(err, preview);
          }
          return cb(null, []);
        });
      };
    })(this));
  };

  StreamArchiver.prototype.getPreviewFromMemory = function(options, cb) {
    if (!this.stores.memory) {
      return cb();
    }
    return this.generatePreview(this.stores.memory.getSegments(options), cb);
  };

  StreamArchiver.prototype.getPreviewFromS3 = function(options, cb) {
    if (!this.stores.s3) {
      return cb();
    }
    return this.stores.s3.getSegments(options)["catch"]((function(_this) {
      return function() {
        return [];
      };
    })(this)).then((function(_this) {
      return function(segments) {
        return _this.generatePreview(segments, cb);
      };
    })(this));
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
    return this.getWaveformFromMemory(id, (function(_this) {
      return function(err, waveform) {
        if (err || waveform) {
          return cb(err, waveform);
        }
        return _this.getWaveformFromS3(id, function(err, waveform) {
          if (err || waveform) {
            return cb(err, waveform);
          }
          return cb(new Error("Not found"));
        });
      };
    })(this));
  };

  StreamArchiver.prototype.getWaveformFromMemory = function(id, cb) {
    var ref;
    if (!this.stores.memory) {
      return cb();
    }
    return cb(null, (ref = this.stores.memory.getSegmentById(id)) != null ? ref.waveform : void 0);
  };

  StreamArchiver.prototype.getWaveformFromS3 = function(id, cb) {
    if (!this.stores.s3) {
      return cb();
    }
    return this.stores.s3.getSegmentById(id).then(function(segment) {
      return cb(null, segment.waveform);
    })["catch"](function() {
      return cb();
    });
  };

  return StreamArchiver;

})(require("events").EventEmitter);

//# sourceMappingURL=stream.js.map
