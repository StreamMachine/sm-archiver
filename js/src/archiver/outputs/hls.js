var HlsOutput, _, debug, m3u;

m3u = require("m3u");

_ = require("underscore");

debug = require("debug")("sm:archiver:outputs:hls");

HlsOutput = (function() {
  function HlsOutput(stream) {
    this.stream = stream;
    _.extend(this, m3u.httpLiveStreamingWriter());
    this.version(3);
    this.targetDuration(10);
    this.length = 0;
    this.max = 360;
    debug("Created for " + this.stream.key);
  }

  HlsOutput.prototype.append = function(segments) {
    if (!segments.length) {
      return this;
    }
    if (!this.length) {
      this.mediaSequence(_.first(segments).id);
      this.comment("EXT-X-DISCONTINUITY-SEQUENCE:3");
      this.comment("EXT-X-INDEPENDENT-SEGMENTS");
    }
    _.each(segments, function(segment) {
      if (this.length === this.max) {
        return;
      }
      this.programDateTime(segment.ts.toISOString());
      this.file("/" + this.stream.key + "/ts/" + segment.id + "." + this.stream.opts.format, segment.duration / 1000);
      return this.length++;
    }, this);
    this.endlist();
    debug("Current length for " + this.stream.key + " is " + this.length);
    return this;
  };

  return HlsOutput;

})();

module.exports = HlsOutput;

//# sourceMappingURL=hls.js.map
