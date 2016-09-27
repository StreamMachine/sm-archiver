INTERVAL = 10000;

class Monitor
    constructor: (options) ->
        @graphite = options.graphite
        @server = options.server
        setInterval () =>
            @check()
        , INTERVAL

    check: ->

module.exports = Monitor;
