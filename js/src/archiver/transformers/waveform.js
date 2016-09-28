var PassThrough, WaveformTransformer, debug, waveform,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

waveform = require("sm-waveform");

PassThrough = require("stream").PassThrough;

debug = require("debug")("sm:archiver:transformers:waveform");

WaveformTransformer = (function(superClass) {
  extend(WaveformTransformer, superClass);

  function WaveformTransformer(stream, pps) {
    this.stream = stream;
    this.pps = pps;
    WaveformTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created for " + this.stream.key);
  }

  WaveformTransformer.prototype._transform = function(segment, encoding, callback) {
    var pt;
    pt = new PassThrough();
    debug("Segment " + segment.id + " from " + this.stream.key);
    new waveform.Waveform(pt, {
      pixelsPerSecond: this.pps
    }, (function(_this) {
      return function(error, waveform) {
        if (error) {
          return callback(error);
        }
        segment.waveform = waveform.asJSON();
        _this.push(segment);
        return callback();
      };
    })(this));
    return pt.end(segment.audio);
  };

  return WaveformTransformer;

})(require("stream").Transform);

module.exports = WaveformTransformer;

//# sourceMappingURL=waveform.js.map
