var PassThrough, WaveformTransformer, debug, waveform,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

waveform = require("sm-waveform");

PassThrough = require("stream").PassThrough;

debug = require("debug")("sm:archiver:transformers:waveform");

module.exports = WaveformTransformer = (function(superClass) {
  extend(WaveformTransformer, superClass);

  function WaveformTransformer(pps) {
    this.pps = pps;
    WaveformTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created");
  }

  WaveformTransformer.prototype._transform = function(obj, encoding, cb) {
    var pt;
    pt = new PassThrough();
    debug("Segment " + obj.id);
    new waveform.Waveform(pt, {
      pixelsPerSecond: this.pps
    }, (function(_this) {
      return function(err, wave) {
        if (err) {
          return cb(err);
        }
        obj.waveform = wave.asJSON();
        _this.push(obj);
        return cb();
      };
    })(this));
    return pt.end(obj.audio);
  };

  return WaveformTransformer;

})(require("stream").Transform);

//# sourceMappingURL=waveform.js.map
