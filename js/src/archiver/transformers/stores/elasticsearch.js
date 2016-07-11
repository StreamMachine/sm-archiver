var ElasticsearchStoreTransformer, debug,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

debug = require("debug")("sm:archiver:transformers:stores:elasticsearch");

module.exports = ElasticsearchStoreTransformer = (function(superClass) {
  extend(ElasticsearchStoreTransformer, superClass);

  function ElasticsearchStoreTransformer(elasticsearch) {
    this.elasticsearch = elasticsearch;
    ElasticsearchStoreTransformer.__super__.constructor.call(this, {
      objectMode: true
    });
    debug("Created");
  }

  ElasticsearchStoreTransformer.prototype._transform = function(segment, encoding, callback) {
    debug("Segment " + segment.id);
    return this.elasticsearch.indexSegment(segment).then((function(_this) {
      return function() {
        _this.push(segment);
        return callback();
      };
    })(this));
  };

  return ElasticsearchStoreTransformer;

})(require("stream").Transform);

//# sourceMappingURL=elasticsearch.js.map
