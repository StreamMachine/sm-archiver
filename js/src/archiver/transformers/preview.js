var PreviewTransformer, debug,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

debug = require("debug")("sm:archiver:transformers:preview");

module.exports = PreviewTransformer = (function(superClass) {
  extend(PreviewTransformer, superClass);

  function PreviewTransformer(width, length) {
    this.width = width;
    this.length = length;
    this._getSamplesPerPixel = bind(this._getSamplesPerPixel, this);
    this._getResampleOptions = bind(this._getResampleOptions, this);
    this.psegWidth = Math.ceil(this.width / this.length);
    PreviewTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created");
  }

  PreviewTransformer.prototype._transform = function(obj, encoding, cb) {
    var resample_options;
    debug("Segment " + obj.id);
    resample_options = this._getResampleOptions(obj);
    obj.preview = obj.wavedata.resample(resample_options).adapter.data;
    this.push(obj);
    return cb();
  };

  PreviewTransformer.prototype._getResampleOptions = function(segment) {
    if (this._getSamplesPerPixel(segment) < segment.wavedata.adapter.scale) {
      return {
        scale: segment.wavedata.adapter.scale
      };
    }
    return {
      width: this.psegWidth
    };
  };

  PreviewTransformer.prototype._getSamplesPerPixel = function(segment) {
    return Math.floor(segment.wavedata.duration * segment.wavedata.adapter.sample_rate / this.psegWidth);
  };

  return PreviewTransformer;

})(require("stream").Transform);

//# sourceMappingURL=preview.js.map
