var bindings;

bindings = require("bindings");

module.exports = (function(_this) {
  return function(dirname, binding) {
    return bindings({
      module_root: dirname,
      bindings: binding
    });
  };
})(this);

//# sourceMappingURL=bindings.js.map
