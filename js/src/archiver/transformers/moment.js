var MomentTransformer, debug, moment,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

moment = require("moment");

debug = require("debug")("sm:archiver:transformers:moment");

module.exports = MomentTransformer = (function(superClass) {
  extend(MomentTransformer, superClass);

  function MomentTransformer() {
    MomentTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created");
  }

  MomentTransformer.prototype._transform = function(segment, encoding, callback) {
    debug("Segment " + segment.id);
    segment.moment = moment(segment.ts);
    this.push(segment);
    return callback();
  };

  return MomentTransformer;

})(require("stream").Transform);

//# sourceMappingURL=moment.js.map
