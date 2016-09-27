bindings = require "bindings"

module.exports = (dirname, binding) =>
    bindings
        module_root: dirname,
        bindings: binding
