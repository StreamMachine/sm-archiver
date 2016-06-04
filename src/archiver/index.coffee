SlaveIO     = require "streammachine/js/src/streammachine/slave/slave_io"
Logger      = require "streammachine/js/src/streammachine/logger"

Server          = require "../server"

debug = require("debug")("sm:archiver")

module.exports = class Archiver extends require "streammachine/js/src/streammachine/slave"
    constructor: (@options) ->
        @streams        = {}
        @stream_groups  = {}
        @root_route     = null

        @connected      = false
        @_retrying      = null

        @log = new Logger { stdout:true }

        @io = new SlaveIO @, @log.child(module:"io"), @options.master

        @io.on "connected", =>
            debug "Connected to master."

        @io.on "disconnected", =>
            debug "Disconnected from master."

        @once "streams", =>
            @_configured = true

            for k,s of @streams
                if @options.streams?.length > 0 && @options.streams.indexOf(k) == -1
                    continue

                do (k,s) =>
                    debug "Creating StreamArchiver for #{k}"
                    s._archiver = new Archiver.StreamArchiver s, @options

        # create a server
        @server = new Server @, @options.port, @log.child(component:"server")

    #----------

    @StreamArchiver: require "./stream_archiver"

