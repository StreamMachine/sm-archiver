SlaveIO = require "streammachine/js/src/streammachine/slave/slave_io"
Logger = require "streammachine/js/src/streammachine/logger"
StreamArchiver = require "./stream"
Server = require "./server"
Monitors = require "./monitors"
debug = require("debug") "sm:archiver"

class Archiver extends require "streammachine/js/src/streammachine/slave"
    constructor: (@options) ->
        @streams = {}
        @stream_groups = {}
        @root_route = null
        @connected = false
        @_retrying = null
        @log = new Logger stdout: true
        @io = new SlaveIO @, @log.child(module: "io"), @options.master

        @io.on "connected", =>
            debug "Connected to master"
        @io.on "disconnected", =>
            debug "Disconnected from master"

        @once "streams", =>
            @_configured = true
            for key, stream of @streams
                if @options.streams?.length > 0 && @options.streams.indexOf(key) == -1
                    continue
                do (key, stream) =>
                    debug "Creating StreamArchiver for #{key}"
                    stream.archiver = new StreamArchiver stream, @options

        @server = new Server @, @options, @log.child(component:"server")
        @monitors = new Monitors @, @server, @options
        debug "Created"

    #----------

#----------

module.exports = Archiver
