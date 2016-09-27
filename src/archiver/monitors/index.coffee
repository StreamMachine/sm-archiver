_ = require "underscore"
Graphite = require "./graphite"
monitors =
    v8: require "./v8"
    server: require "./server"

class Monitors
    constructor: (@core, @server, @opts) ->
        @monitors = {};
        @graphite = new Graphite(@opts.graphite)
        _.each monitors, (Monitor, name) =>
            @monitors[name] = new Monitor
                graphite: @graphite
                server: @server

module.exports = Monitors;
