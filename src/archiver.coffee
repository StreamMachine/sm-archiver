SlaveIO     = require "streammachine/src/streammachine/slave/slave_io"
Logger      = require "streammachine/src/streammachine/logger"

WaveTransform = require "./wave_transform"
Server = require "./server"

_ = require "underscore"

debug = require("debug")("sm-archiver")

Sequelize = require "sequelize"

module.exports = class Archiver extends require("streammachine/src/streammachine/slave")
    constructor: (@options) ->
        @streams        = {}
        @stream_groups  = {}
        @root_route     = null

        @connected      = false
        @_retrying      = null

        @log = new Logger { stdout:true }

        if @options.sqlstore
            @sql = new Archiver.SequelStore @options.sqlstore, @log.child(component:"sqlstore")

        @io = new SlaveIO @, @log.child(module:"io"), @options.master

        @io.on "connected", =>
            debug "Connected to master."

        @io.on "disconnected", =>
            debug "Disconnected from master."

        @once "streams", =>
            @_configured = true

            for k,s of @streams
                do (k,s) =>
                    debug "Creating StreamArchiver for #{k}"
                    s._archiver = new Archiver.StreamArchiver s, (obj) => @_saveSegment(s,obj)
                    s._waveforms = {}

        # create a server
        @server = new Server @, @options.port, @log.child(component:"server")

    _saveSegment: (stream,obj) ->
        @sql?.save(stream,obj)

        # all we need to cache here is the waveform... we'll use normal
        # channels for the segment itself
        debug "Stashing waveform for segment #{obj.id}"
        stream._waveforms[obj.id] = obj.waveform_json

    #----------

    class @SequelStore
        constructor: (@opts,@log) ->
            @_seq = new Sequelize @opts.uri, logging:((err) ->)
            @segment = @_seq.define "Segment",
                stream:         Sequelize.STRING
                id:             Sequelize.INTEGER
                ts:             Sequelize.DATE
                end_ts:         Sequelize.DATE
                ts_actual:      Sequelize.DATE
                end_ts_actual:  Sequelize.DATE
                waveform:       Sequelize.TEXT
                duration:       Sequelize.FLOAT
                data_length:    Sequelize.INTEGER
                audio:          Sequelize.BLOB('medium')

            @segment.sync()

        save: (stream,obj) ->
            @segment.create
                stream:         stream.key
                id:             obj.id
                ts:             obj.ts
                end_ts:         obj.end_ts
                ts_actual:      obj.ts_actual
                end_ts_actual:  obj.end_ts_actual
                data_length:    obj.data_length
                duration:       obj.duration
                audio:          obj.cbuf
                waveform:       JSON.stringify(obj.waveform)
            .catch (err) => @log.error "sequel err: #{err}"

    #----------

    class @StreamArchiver
        constructor: (@stream,@wfunc) ->
            @wave_transform = new WaveTransform

            @wave_transform.on "readable", =>
                @wfunc obj while obj = @wave_transform.read()

            # FIXME: Need to look this up on startup
            @max_id = 0

            # FIXME: On startup, we need to wait until the rewind buffer is loaded before
            # looping through segments

            # process snapshots to look for new segments
            @stream.source.on "hls_snapshot", (snapshot) =>
              @processSnapshot snapshot

            @stream.source.getHLSSnapshot (err,snapshot) =>
              @processSnapshot snapshot

        #----------

        processSnapshot: (snapshot) ->
            return false if !snapshot

            debug "HLS Snapshot for #{@stream.key}"

            for seg in snapshot.segments
                if seg.id <= @max_id
                    # do nothing
                else
                    @max_id = seg.id
                    debug "Should archive #{seg.id} for #{@stream.key}"

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

                        cbuf = Buffer.concat(buffers,length)

                        obj = _.extend {}, seg,
                            cbuf:       cbuf
                            duration:   duration
                            meta:       meta

                        # -- generate waveform -- #

                        @wave_transform.write obj
