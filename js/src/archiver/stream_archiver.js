var Debounce, SegmentPuller, StreamArchiver, WaveTransform, WaveformData, _, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Debounce = require("streammachine/js/src/streammachine/util/debounce");

WaveTransform = require("../wave_transform");

SegmentPuller = require("../segment_puller");

WaveformData = require("waveform-data");

_ = require("underscore");

debug = require("debug")("sm:archiver:stream");

module.exports = StreamArchiver = (function(superClass) {
  extend(StreamArchiver, superClass);

  function StreamArchiver(stream, options1) {
    this.stream = stream;
    this.options = options1;
    this.segments = {};
    this.snapshot = null;
    this.preview = null;
    this.preview_json = null;
    this.stores = _.mapObject(this.options.stores || [], (function(_this) {
      return function(options, store) {
        debug("Creating " + store + " Store for " + _this.stream.key + " Stream");
        return new StreamArchiver.Stores[store](_this.stream, options);
      };
    })(this));
    this.seg_puller = new SegmentPuller(this.stream);
    this.wave_transform = new WaveTransform(this.options.pixels_per_second);
    this.seg_puller.pipe(this.wave_transform);
    this._segDebounce = new Debounce(1000, (function(_this) {
      return function() {
        return _this._updatePreview();
      };
    })(this));
    this.wave_transform.on("readable", (function(_this) {
      return function() {
        var results, seg;
        results = [];
        while (seg = _this.wave_transform.read()) {
          seg.wavedata = WaveformData.create(seg.waveform);
          _this.segments[seg.id] = seg;
          results.push(_this._segDebounce.ping());
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
          _this._segDebounce.ping();
        }
        ref1 = _this.snapshot.segments;
        results = [];
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          seg = ref1[j];
          if (_this.segments[seg.id] == null) {
            _this.seg_puller.write(seg);
            results.push(_this.segments[seg.id] = false);
          } else {
            results.push(void 0);
          }
        }
        return results;
      };
    })(this));
  }

  StreamArchiver.prototype.getPreview = function(cb) {
    if (this.preview) {
      return cb(null, this.preview, this.preview_json);
    } else {
      return cb(new Error("No preview available"));
    }
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

  StreamArchiver.prototype._getResampleOptions = function(id) {
    var pseg_width;
    pseg_width = Math.ceil(this.options.preview_width / this.snapshot.segments.length);
    if (this.segments[id] && pseg_width < this.segments[id].wavedata.adapter.scale) {
      return {
        scale: this.segments[id].wavedata.adapter.scale
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
