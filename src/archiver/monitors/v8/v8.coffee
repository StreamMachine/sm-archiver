v8 = require "v8"
_ = require "underscore"
EventEmitter = require("eventemitter2").EventEmitter2
cV8 = require("./bindings") __dirname, "cv8"

class V8 extends EventEmitter
    constructor: () ->
        super
            wildcard: true,
            delimiter: ":"
        _.extend @, cV8, v8
        @onGC (event, data) =>
            @emit event, data

module.exports = V8
