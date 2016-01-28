var WaveTransform, execFile, fs, temp, waveform,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

waveform = require("waveform");

temp = require("temp");

fs = require("fs");

execFile = require("child_process").execFile;

module.exports = WaveTransform = (function(_super) {
  __extends(WaveTransform, _super);

  function WaveTransform(waveBin, width) {
    this.waveBin = waveBin;
    this.width = width;
    WaveTransform.__super__.constructor.call(this, {
      objectMode: true
    });
  }

  WaveTransform.prototype._transform = function(obj, encoding, cb) {
    return temp.open('sm-archive', (function(_this) {
      return function(err, info) {
        if (err) {
          console.error("Tempfile error: " + err);
          cb();
          return false;
        }
        return fs.write(info.fd, obj.cbuf, 0, obj.cbuf.length, null, function(err) {
          if (err) {
            console.error("fd.write error: " + err);
            cb();
            return false;
          }
          return fs.close(info.fd, function(err) {
            return execFile(_this.waveBin, [info.path, "--wjs-width", _this.width, "--scan"], function(err, stdout, stderr) {
              if (err) {
                console.error("waveform error: " + err);
                cb();
                return false;
              }
              return fs.unlink(info.path, function(err) {
                obj.waveform = JSON.parse(stdout);
                obj.waveform_json = stdout;
                _this.push(obj);
                return cb();
              });
            });
          });
        });
      };
    })(this));
  };

  return WaveTransform;

})(require("stream").Transform);

//# sourceMappingURL=wave_transform.js.map
