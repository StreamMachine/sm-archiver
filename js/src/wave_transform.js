var PassThrough, WaveTransform, debug, fs, temp, waveform,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

waveform = require("sm-waveform");

PassThrough = require("stream").PassThrough;

temp = require("temp");

fs = require("fs");

debug = require("debug")("sm-archiver");

module.exports = WaveTransform = (function(_super) {
  __extends(WaveTransform, _super);

  function WaveTransform(pps) {
    this.pps = pps;
    WaveTransform.__super__.constructor.call(this, {
      objectMode: true
    });
  }

  WaveTransform.prototype._transform = function(obj, encoding, cb) {
    var pt;
    pt = new PassThrough();
    debug("In WaveTransform for " + obj.id);
    new waveform.Waveform(pt, {
      pixelsPerSecond: this.pps
    }, (function(_this) {
      return function(err, wave) {
        if (err) {
          return cb(err);
        }
        obj.waveform = wave.asJSON();
        obj.waveform_json = JSON.stringify(obj.waveform);
        _this.push(obj);
        return cb();
      };
    })(this));
    return pt.end(obj.cbuf);
  };

  return WaveTransform;

})(require("stream").Transform);

//# sourceMappingURL=wave_transform.js.map
