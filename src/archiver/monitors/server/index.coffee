Monitor = require("../monitor")
graphite = require("../graphite")
time = require("../../utils/time")
debug = require("debug") "sm:archiver:monitors:server"

class ServerMonitor extends Monitor
    constructor: (options) ->
        super(options)
        @connections = 0
        @requests = 0
        @server._server.on "connection", @onConnection.bind(@)
        @server._server.on "request", @onRequest.bind(@)

    onConnection: (socket) ->
        @connections++
        @graphite.increment ["server", "connections", "opened"]
        @graphite.gauge ["server", "connections", "concurrent"], @connections
        socket.on "error", @onConnectionError.bind(@)
        socket.on "close", @onConnectionClose.bind(@)

    onConnectionError: (error) ->
        @graphite.increment ["server", "connections", "errors"]
        debug error

    onConnectionClose: () ->
        @connections--
        @graphite.increment ["server", "connections", "closed"]
        @graphite.gauge ["server", "connections", "concurrent"], @connections

    onRequest: (req, res) ->
        @requests++
        @graphite.increment ["server", "requests", "opened"]
        @graphite.gauge ["server", "requests", "concurrent"], @requests
        req.on "error", @onRequestError.bind(@, req)
        res.on "finish", @onResponseFinish.bind(@, req, res)

    onRequestError: (req, event) ->
        @graphite.increment ["server", "requests", "error", event.type or "uncaught", req.method]

    onResponseFinish: (req, res) ->
        @requests--
        @graphite.increment ["server", "requests", "closed"]
        @graphite.gauge ["server", "requests", "concurrent"], @requests
        @hit req, res

    hit: (req, res) ->
        hasTime = req.startTime and res.startTime
        diff = if hasTime then time.tupleDiff(req.startTime, res.startTime) else 0
        size = res.get("Content-Length") or 0
        metric = ["server", "requests", "hits", req.method, res.statusCode or 0]

        if hasTime
            @graphite.timing metric, time.tupleToMilliseconds(diff).toFixed()
        @graphite.timing metric.concat("size"), size

module.exports = ServerMonitor
