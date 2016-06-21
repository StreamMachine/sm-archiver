var WavedataTransformer, WaveformData, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

WaveformData = require("waveform-data");

debug = require("debug")("sm:archiver:transformers:wavedata");

module.exports = WavedataTransformer = (function(superClass) {
  extend(WavedataTransformer, superClass);

  function WavedataTransformer() {
    WavedataTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created");
  }

  WavedataTransformer.prototype._transform = function(obj, encoding, cb) {
    debug("Segment " + obj.id);
    obj.wavedata = WaveformData.create(obj.waveform);
    this.push(obj);
    return cb();
  };

  return WavedataTransformer;

})(require("stream").Transform);

//# sourceMappingURL=wavedata.js.map
