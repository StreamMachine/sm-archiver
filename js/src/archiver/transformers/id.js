var IdTransformer, debug, moment,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

moment = require("moment");

debug = require("debug")("sm:archiver:transformers:id");

module.exports = IdTransformer = (function(superClass) {
  extend(IdTransformer, superClass);

  function IdTransformer() {
    IdTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created");
  }

  IdTransformer.prototype._transform = function(segment, encoding, callback) {
    var id;
    id = moment(segment.ts).valueOf();
    debug("Segment " + segment.id + " -> " + id);
    segment.id = id;
    this.push(segment);
    return callback();
  };

  return IdTransformer;

})(require("stream").Transform);

//# sourceMappingURL=id.js.map
