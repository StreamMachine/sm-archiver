SlaveIO = require "streammachine/src/streammachine/slave/slave_io"
Logger  = require "streammachine/src/streammachine/logger"

module.exports = class Archiver extends require("streammachine/src/streammachine/slave")
    constructor: (@options) ->
        @streams        = {}
        @stream_groups  = {}
        @root_route     = null

        @connected      = false
        @_retrying      = null

        @log = new Logger { stdout:true }

        @io = new SlaveIO @, @log.child(module:"io"), @options.master

        @io.on "connected", =>
            console.log "Connected to master."

        @io.on "disconnected", =>
            console.log "Disconnected from master."

        @once "streams", =>
            @_configured = true

            for k,s of @streams
                s._archiver = new Archiver.StreamArchiver s


    #----------

    class @StreamArchiver
        constructor: (@stream) ->
            # FIXME: Need to look this up on startup
            @max_id = 0

            # process snapshots to look for new segments
            @stream.source.on "hls_snapshot", (snapshot) =>
                return false if !snapshot

                for seg in snapshot.segments
                    if seg.id <= @max_id
                        # do nothing
                    else
                        @max_id = seg.id
                        console.log "Should archive #{seg.id} for #{@stream.key}"

                        dur = @stream.secsToOffset seg.duration / 1000
                        @stream._rbuffer.range seg.ts_actual, dur, (err,chunks) =>
                            if err
                                console.error "Error getting segment rewind: #{err}"
                                return false

                            buffers     = []
                            length      = 0
                            duration    = 0
                            meta        = null

                            for b in chunks
                                length      += b.data.length
                                duration    += b.duration

                                buffers.push b.data

                                meta = b.meta if !meta

                            cbuf = Buffer.concat(buffers)

                            console.log "Buffer prepared.", stream.key, seg.id, length, duration, seg.duration


