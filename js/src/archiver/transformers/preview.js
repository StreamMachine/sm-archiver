var PreviewTransformer, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

debug = require("debug")("sm:archiver:transformers:preview");

module.exports = PreviewTransformer = (function(superClass) {
  extend(PreviewTransformer, superClass);

  function PreviewTransformer(_getResampleOptions) {
    this._getResampleOptions = _getResampleOptions;
    PreviewTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
  }

  PreviewTransformer.prototype._transform = function(obj, encoding, cb) {
    var resample_options;
    debug("In PreviewTransformer for " + obj.id);
    resample_options = this._getResampleOptions(obj);
    obj.preview = obj.wavedata.resample(resample_options).adapter.data;
    this.push(obj);
    return cb();
  };

  return PreviewTransformer;

})(require("stream").Transform);

//# sourceMappingURL=preview.js.map
