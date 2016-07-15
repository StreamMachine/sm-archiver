var AudioTransformer, ElasticsearchStore, ElasticsearchStoreTransformer, IdTransformer, MemoryStore, MemoryStoreTransformer, PreviewTransformer, QueueMemoryStoreTransformer, S3Store, S3StoreTransformer, StreamArchiver, WavedataTransformer, WaveformTransformer, _, debug, segmentKeys,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

_ = require("underscore");

IdTransformer = require("./transformers/id");

AudioTransformer = require("./transformers/audio");

WaveformTransformer = require("./transformers/waveform");

WavedataTransformer = require("./transformers/wavedata");

PreviewTransformer = require("./transformers/preview");

MemoryStore = require("./stores/memory");

QueueMemoryStoreTransformer = require("./transformers/stores/memory/queue");

MemoryStoreTransformer = require("./transformers/stores/memory");

ElasticsearchStore = require("./stores/elasticsearch");

ElasticsearchStoreTransformer = require("./transformers/stores/elasticsearch");

S3Store = require("./stores/s3");

S3StoreTransformer = require("./transformers/stores/s3");

debug = require("debug")("sm:archiver:stream");

segmentKeys = ["id", "ts", "end_ts", "ts_actual", "end_ts_actual", "data_length", "duration", "discontinuitySeq", "pts", "preview"];

module.exports = StreamArchiver = (function(superClass) {
  extend(StreamArchiver, superClass);

  function StreamArchiver(stream, options1) {
    var ref, ref1, ref2, ref3, ref4, ref5;
    this.stream = stream;
    this.options = options1;
    this.stores = {};
    this.transformers = [new AudioTransformer(this.stream), new WaveformTransformer(this.options.pixels_per_second)];
    if ((ref = this.options.stores) != null ? (ref1 = ref.memory) != null ? ref1.enabled : void 0 : void 0) {
      this.stores.memory = new MemoryStore(this.options.stores.memory);
      this.transformers.unshift(new QueueMemoryStoreTransformer(this.stores.memory));
      this.transformers.push(new MemoryStoreTransformer(this.stores.memory));
    }
    if ((ref2 = this.options.stores) != null ? (ref3 = ref2.elasticsearch) != null ? ref3.enabled : void 0 : void 0) {
      this.stores.elasticsearch = new ElasticsearchStore(this.stream, this.options.stores.elasticsearch);
      this.transformers.push(new ElasticsearchStoreTransformer(this.stores.elasticsearch));
    }
    if ((ref4 = this.options.stores) != null ? (ref5 = ref4.s3) != null ? ref5.enabled : void 0 : void 0) {
      this.stores.s3 = new S3Store(this.stream, this.options.stores.s3);
      this.transformers.push(new S3StoreTransformer(this.stores.s3));
    }
    this.transformers.unshift(new IdTransformer());
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
        debug("HLS Snapshot received via broadcast from " + _this.stream.key + " (" + snapshot.segments.length + " segments)");
        return _this.stream.emit("hls_snapshot", snapshot);
      };
    })(this));
    this.stream._once_source_loaded((function(_this) {
      return function() {
        return _this.stream.source.getHLSSnapshot(function(err, snapshot) {
          debug("HLS snapshot from initial source load of " + _this.stream.key + " (" + snapshot.segments.length + " segments)");
          return _this.stream.emit("hls_snapshot", snapshot);
        });
      };
    })(this));
    this.stream.on("hls_snapshot", (function(_this) {
      return function(snapshot) {
        var i, len, ref6, results, segment;
        ref6 = snapshot.segments;
        results = [];
        for (i = 0, len = ref6.length; i < len; i++) {
          segment = ref6[i];
          results.push(_.first(_this.transformers).write(segment));
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
        return _this.getPreviewFromElasticsearch(options, function(err, preview) {
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
    return this.generatePreview(this.stores.memory.get(options), cb);
  };

  StreamArchiver.prototype.getPreviewFromElasticsearch = function(options, cb) {
    if (!this.stores.elasticsearch) {
      return cb();
    }
    return this.stores.elasticsearch.getSegments(options)["catch"](function() {
      return [];
    }).then((function(_this) {
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
        return _this.getWaveformFromElasticsearch(id, cb);
      };
    })(this));
  };

  StreamArchiver.prototype.getWaveformFromMemory = function(id, cb) {
    var ref;
    if (!this.stores.memory) {
      return cb();
    }
    return cb(null, (ref = this.stores.memory.getById(id)) != null ? ref.waveform : void 0);
  };

  StreamArchiver.prototype.getWaveformFromElasticsearch = function(id, cb) {
    if (!this.stores.elasticsearch) {
      return cb();
    }
    return this.stores.elasticsearch.getSegmentById(id).then(function(segment) {
      return cb(null, segment != null ? segment.waveform : void 0);
    })["catch"](function() {
      return cb();
    });
  };

  StreamArchiver.prototype.getAudio = function(id, format, cb) {
    return this.getAudioFromMemory(id, format, (function(_this) {
      return function(err, audio) {
        if (err || audio) {
          return cb(err, audio);
        }
        return _this.getAudioFromS3(id, format, cb);
      };
    })(this));
  };

  StreamArchiver.prototype.getAudioFromMemory = function(id, format, cb) {
    var ref;
    if (!this.stores.memory) {
      return cb();
    }
    return cb(null, (ref = this.stores.memory.getById(id)) != null ? ref.audio : void 0);
  };

  StreamArchiver.prototype.getAudioFromS3 = function(id, format, cb) {
    if (!this.stores.s3) {
      return cb();
    }
    return this.stores.s3.getAudioById(id, format).then(function(audio) {
      return cb(null, audio);
    })["catch"](function() {
      return cb();
    });
  };

  return StreamArchiver;

})(require("events").EventEmitter);

//# sourceMappingURL=stream.js.map
