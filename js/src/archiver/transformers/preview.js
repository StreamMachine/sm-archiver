var PreviewTransformer, debug,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

debug = require("debug")("sm:archiver:transformers:preview");

PreviewTransformer = (function(superClass) {
  extend(PreviewTransformer, superClass);

  function PreviewTransformer(stream, width, length) {
    this.stream = stream;
    this.width = width;
    this.length = length;
    this.getSamplesPerPixel = bind(this.getSamplesPerPixel, this);
    this.getResampleOptions = bind(this.getResampleOptions, this);
    this.psegWidth = Math.ceil(this.width / this.length);
    PreviewTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created for " + this.stream.key);
  }

  PreviewTransformer.prototype._transform = function(segment, encoding, callback) {
    var options;
    debug("Segment " + segment.id + " from " + this.stream.key);
    options = this.getResampleOptions(segment);
    segment.preview = segment.wavedata.resample(options).adapter.data;
    this.push(segment);
    return callback();
  };

  PreviewTransformer.prototype.getResampleOptions = function(segment) {
    if (this.getSamplesPerPixel(segment) < segment.wavedata.adapter.scale) {
      return {
        scale: segment.wavedata.adapter.scale
      };
    }
    return {
      width: this.psegWidth
    };
  };

  PreviewTransformer.prototype.getSamplesPerPixel = function(segment) {
    return Math.floor(segment.wavedata.duration * segment.wavedata.adapter.sample_rate / this.psegWidth);
  };

  return PreviewTransformer;

})(require("stream").Transform);

module.exports = PreviewTransformer;

//# sourceMappingURL=preview.js.map
