var Debounce, PreviewTransformer, SegmentPuller, StreamArchiver, WaveformData, WaveformTransformer, _, debug, segmentKeys,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Debounce = require("streammachine/js/src/streammachine/util/debounce");

WaveformTransformer = require("./transformers/waveform");

PreviewTransformer = require("./transformers/preview");

SegmentPuller = require("../segment_puller");

WaveformData = require("waveform-data");

_ = require("underscore");

debug = require("debug")("sm:archiver:stream");

segmentKeys = ["id", "ts", "end_ts", "ts_actual", "end_ts_actual", "data_length", "duration", "discontinuitySeq", "pts", "preview"];

module.exports = StreamArchiver = (function(superClass) {
  extend(StreamArchiver, superClass);

  function StreamArchiver(stream, options1) {
    this.stream = stream;
    this.options = options1;
    this._getResampleOptions = bind(this._getResampleOptions, this);
    this.segments = {};
    this.snapshot = null;
    this.preview = null;
    this.preview_json = null;
    this.stores = _.mapObject(_.filter(this.options.stores || [], 'enabled'), (function(_this) {
      return function(options, store) {
        debug("Creating " + store + " Store for " + _this.stream.key + " Stream");
        return new StreamArchiver.Stores[store](_this.stream, options);
      };
    })(this));
    this.seg_puller = new SegmentPuller(this.stream);
    this.transformers = {
      waveform: new WaveformTransformer(this.options.pixels_per_second),
      preview: new PreviewTransformer(this._getResampleOptions)
    };
    this.seg_puller.pipe(this.transformers.waveform).pipe(this.transformers.preview);
    this.transformers.preview.on("readable", (function(_this) {
      return function() {
        var results, seg;
        results = [];
        while (seg = _this.transformers.preview.read()) {
          results.push(_this.segments[seg.id] = seg);
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
        var i, id, j, len, len1, ref, ref1, results, seg;
        debug("HLS Snapshot for " + _this.stream.key + " (" + snapshot.segments.length + " segments)");
        debug("Rewind extents are ", _this.stream._rbuffer.first(), _this.stream._rbuffer.last());
        _this.snapshot = snapshot;
        ref = _.difference(Object.keys(_this.segments), _.map(_this.snapshot.segments, function(s) {
          return s.id.toString();
        }));
        for (i = 0, len = ref.length; i < len; i++) {
          id = ref[i];
          debug("Expiring segment " + id + " from waveform cache");
          delete _this.segments[id];
        }
        ref1 = _this.snapshot.segments;
        results = [];
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          seg = ref1[j];
          if (_this.segments[seg.id] == null) {
            results.push(_this.seg_puller.write(seg));
          } else {
            results.push(void 0);
          }
        }
        return results;
      };
    })(this));
  }

  StreamArchiver.prototype.getPreview = function(cb) {
    var preview;
    preview = _.map(this.snapshot.segments, (function(_this) {
      return function(segment) {
        segment = _this.segments[segment.id];
        if (!segment) {
          return false;
        }
        return _.pick(segment, segmentKeys);
      };
    })(this));
    return cb(null, _.filter(preview, function(segment) {
      return segment;
    }));
  };

  StreamArchiver.prototype.getWaveform = function(id, cb) {
    if (this.segments[id]) {
      return cb(null, this.segments[id].waveform_json);
    } else {
      return cb(new Error("Not found"));
    }
  };

  StreamArchiver.prototype._updatePreview = function() {
    var i, len, preview, ref, resample_options, seg, segp;
    debug("Generating preview");
    preview = [];
    ref = this.snapshot.segments;
    for (i = 0, len = ref.length; i < len; i++) {
      seg = ref[i];
      resample_options = this._getResampleOptions(seg.id);
      segp = this.segments[seg.id] ? this.segments[seg.id].wavedata.resample(resample_options).adapter.data : _(resample_options.width * 2).times((function(_this) {
        return function() {
          return 0;
        };
      })(this));
      preview.push(_.extend({}, seg, {
        preview: segp
      }));
    }
    this.preview = preview;
    this.preview_json = JSON.stringify(this.preview);
    this.emit("preview", this.preview, this.preview_json);
    return debug("Preview generation complete");
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

  StreamArchiver.Stores = {
    s3: require("./stores/s3")
  };

  return StreamArchiver;

})(require("events").EventEmitter);

//# sourceMappingURL=stream_archiver.js.map
