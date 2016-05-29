var Archiver, Debounce, Logger, SegmentPuller, Server, SlaveIO, WaveTransform, WaveformData, _, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

SlaveIO = require("streammachine/js/src/streammachine/slave/slave_io");

Logger = require("streammachine/js/src/streammachine/logger");

Debounce = require("streammachine/js/src/streammachine/util/debounce");

WaveTransform = require("./wave_transform");

SegmentPuller = require("./segment_puller");

Server = require("./server");

WaveformData = require("waveform-data");

_ = require("underscore");

debug = require("debug")("sm-archiver");

module.exports = Archiver = (function(superClass) {
  extend(Archiver, superClass);

  function Archiver(options) {
    this.options = options;
    this.streams = {};
    this.stream_groups = {};
    this.root_route = null;
    this.connected = false;
    this._retrying = null;
    this.log = new Logger({
      stdout: true
    });
    this.io = new SlaveIO(this, this.log.child({
      module: "io"
    }), this.options.master);
    this.io.on("connected", (function(_this) {
      return function() {
        return debug("Connected to master.");
      };
    })(this));
    this.io.on("disconnected", (function(_this) {
      return function() {
        return debug("Disconnected from master.");
      };
    })(this));
    this.once("streams", (function(_this) {
      return function() {
        var k, ref, ref1, results, s;
        _this._configured = true;
        ref = _this.streams;
        results = [];
        for (k in ref) {
          s = ref[k];
          if (((ref1 = _this.options.streams) != null ? ref1.length : void 0) > 0 && _this.options.streams.indexOf(k) === -1) {
            continue;
          }
          results.push((function(k, s) {
            debug("Creating StreamArchiver for " + k);
            return s._archiver = new Archiver.StreamArchiver(s, _this.options);
          })(k, s));
        }
        return results;
      };
    })(this));
    this.server = new Server(this, this.options.port, this.log.child({
      component: "server"
    }));
  }

  Archiver.StreamArchiver = (function(superClass1) {
    extend(StreamArchiver, superClass1);

    function StreamArchiver(stream, options) {
      this.stream = stream;
      this.options = options;
      this.segments = {};
      this.snapshot = null;
      this.preview = null;
      this.preview_json = null;
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
            _this._segDebounce.ping();
            results.push(debug("Stashed waveform data for " + seg.id));
          }
          return results;
        };
      })(this));
      this.stream.source.on("hls_snapshot", (function(_this) {
        return function(snapshot) {
          debug("HLS Snapshot received via broadcast");
          _this.snapshot = snapshot;
          return _this.processSnapshot(snapshot);
        };
      })(this));
      this.stream._once_source_loaded((function(_this) {
        return function() {
          return _this.stream.source.getHLSSnapshot(function(err, snapshot) {
            debug("HLS snapshot from initial source load");
            _this.snapshot = snapshot;
            return _this.processSnapshot(snapshot);
          });
        };
      })(this));
    }

    StreamArchiver.prototype.processSnapshot = function(snapshot) {
      var i, id, j, len, len1, ref, ref1, results, seg;
      if (!snapshot) {
        return false;
      }
      debug("HLS Snapshot for " + this.stream.key + " (" + snapshot.segments.length + " segments)");
      debug("Rewind extents are ", this.stream._rbuffer.first(), this.stream._rbuffer.last());
      ref = _.difference(Object.keys(this.segments), _.map(snapshot.segments, function(s) {
        return s.id.toString();
      }));
      for (i = 0, len = ref.length; i < len; i++) {
        id = ref[i];
        debug("Expiring segment " + id + " from waveform cache");
        delete this.segments[id];
        this._segDebounce.ping();
      }
      ref1 = snapshot.segments;
      results = [];
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        seg = ref1[j];
        if (this.segments[seg.id] == null) {
          this.seg_puller.write(seg);
          results.push(this.segments[seg.id] = false);
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

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
      var i, len, preview, pseg_width, ref, seg, segp;
      debug("Generating preview");
      pseg_width = Math.ceil(this.options.preview_width / this.snapshot.segments.length);
      preview = [];
      ref = this.snapshot.segments;
      for (i = 0, len = ref.length; i < len; i++) {
        seg = ref[i];
        segp = this.segments[seg.id] ? this.segments[seg.id].wavedata.resample(pseg_width).adapter.data : _(pseg_width * 2).times(0);
        preview.push(_.extend({}, seg, {
          preview: segp
        }));
      }
      this.preview = preview;
      this.preview_json = JSON.stringify(this.preview);
      this.emit("preview", this.preview, this.preview_json);
      return debug("Preview generation complete");
    };

    return StreamArchiver;

  })(require("events").EventEmitter);

  return Archiver;

})(require("streammachine/js/src/streammachine/slave"));

//# sourceMappingURL=archiver.js.map
