var Archiver, Debounce, Logger, SegmentPuller, Server, SlaveIO, WaveTransform, WaveformData, debug, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

SlaveIO = require("streammachine/js/src/streammachine/slave/slave_io");

Logger = require("streammachine/js/src/streammachine/logger");

Debounce = require("streammachine/js/src/streammachine/util/debounce");

WaveTransform = require("./wave_transform");

SegmentPuller = require("./segment_puller");

Server = require("./server");

WaveformData = require("waveform-data");

_ = require("underscore");

debug = require("debug")("sm-archiver");

module.exports = Archiver = (function(_super) {
  __extends(Archiver, _super);

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
        var k, s, _ref, _ref1, _results;
        _this._configured = true;
        _ref = _this.streams;
        _results = [];
        for (k in _ref) {
          s = _ref[k];
          if (((_ref1 = _this.options.streams) != null ? _ref1.length : void 0) > 0 && _this.options.streams.indexOf(k) === -1) {
            continue;
          }
          _results.push((function(k, s) {
            debug("Creating StreamArchiver for " + k);
            return s._archiver = new Archiver.StreamArchiver(s, _this.options);
          })(k, s));
        }
        return _results;
      };
    })(this));
    this.server = new Server(this, this.options.port, this.log.child({
      component: "server"
    }));
  }

  Archiver.StreamArchiver = (function(_super1) {
    __extends(StreamArchiver, _super1);

    function StreamArchiver(stream, options) {
      this.stream = stream;
      this.options = options;
      this.segments = {};
      this.snapshot = null;
      this.preview = null;
      this.preview_json = null;
      this.seg_puller = new SegmentPuller(this.stream);
      this.wave_transform = new WaveTransform(this.options.waveform, this.options.segment_width);
      this.seg_puller.pipe(this.wave_transform);
      this._segDebounce = new Debounce(1000, (function(_this) {
        return function() {
          return _this._updatePreview();
        };
      })(this));
      this.wave_transform.on("readable", (function(_this) {
        return function() {
          var seg, _results;
          _results = [];
          while (seg = _this.wave_transform.read()) {
            seg.wavedata = WaveformData.create(seg.waveform);
            _this.segments[seg.id] = seg;
            _this._segDebounce.ping();
            _results.push(debug("Stashed waveform data for " + seg.id));
          }
          return _results;
        };
      })(this));
      this.stream.source.on("hls_snapshot", (function(_this) {
        return function(snapshot) {
          _this.snapshot = snapshot;
          return _this.processSnapshot(snapshot);
        };
      })(this));
      this.stream._once_source_loaded((function(_this) {
        return function() {
          return _this.stream.source.getHLSSnapshot(function(err, snapshot) {
            _this.snapshot = snapshot;
            return _this.processSnapshot(snapshot);
          });
        };
      })(this));
    }

    StreamArchiver.prototype.processSnapshot = function(snapshot) {
      var id, seg, _i, _j, _len, _len1, _ref, _ref1, _results;
      if (!snapshot) {
        return false;
      }
      debug("HLS Snapshot for " + this.stream.key + " (" + snapshot.segments.length + " segments)");
      debug("Rewind extents are ", this.stream._rbuffer.first(), this.stream._rbuffer.last());
      _ref = _.difference(Object.keys(this.segments), _.pluck(snapshot.segments, 'id'));
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        id = _ref[_i];
        delete this.segments[id];
        this._segDebounce.ping();
      }
      _ref1 = snapshot.segments;
      _results = [];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        seg = _ref1[_j];
        if (!this.segments[seg.id]) {
          _results.push(this.seg_puller.write(seg));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
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
      var preview, pseg_width, seg, segp, _i, _len, _ref;
      debug("Generating preview");
      pseg_width = Math.ceil(this.options.preview_width / this.snapshot.segments.length);
      preview = [];
      _ref = this.snapshot.segments;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        seg = _ref[_i];
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
