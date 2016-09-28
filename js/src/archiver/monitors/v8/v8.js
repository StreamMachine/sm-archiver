var EventEmitter, V8, _, cV8, v8,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

v8 = require("v8");

_ = require("underscore");

EventEmitter = require("eventemitter2").EventEmitter2;

cV8 = require("./bindings")(__dirname, "cv8");

V8 = (function(superClass) {
  extend(V8, superClass);

  function V8() {
    V8.__super__.constructor.call(this, {
      wildcard: true,
      delimiter: ":"
    });
    _.extend(this, cV8, v8);
    this.onGC((function(_this) {
      return function(event, data) {
        return _this.emit(event, data);
      };
    })(this));
  }

  return V8;

})(EventEmitter);

module.exports = V8;

//# sourceMappingURL=v8.js.map
