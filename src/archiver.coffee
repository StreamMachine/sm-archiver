SlaveIO     = require "streammachine/js/src/streammachine/slave/slave_io"
Logger      = require "streammachine/js/src/streammachine/logger"
Debounce    = require "streammachine/js/src/streammachine/util/debounce"

WaveTransform   = require "./wave_transform"
SegmentPuller   = require "./segment_puller"
Server          = require "./server"

WaveformData = require "waveform-data"

_ = require "underscore"

debug = require("debug")("sm-archiver")

module.exports = class Archiver extends require("streammachine/js/src/streammachine/slave")
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

    class @StreamArchiver extends require("events").EventEmitter
        constructor: (@stream,@options) ->
            @segments = {}
            @snapshot = null
            @preview = null
            @preview_json = null

            @seg_puller = new SegmentPuller @stream
            @wave_transform = new WaveTransform @options.pixels_per_second
            @seg_puller.pipe(@wave_transform)

            @_segDebounce = new Debounce 1000, =>
                @_updatePreview()

            @wave_transform.on "readable", =>
                while seg = @wave_transform.read()
                    seg.wavedata = WaveformData.create seg.waveform
                    @segments[seg.id] = seg
                    @_segDebounce.ping()
                    debug "Stashed waveform data for #{seg.id}"

            # process snapshots to look for new segments
            @stream.source.on "hls_snapshot", (snapshot) =>
                debug "HLS Snapshot received via broadcast"
                @snapshot = snapshot
                @processSnapshot snapshot

            @stream._once_source_loaded =>
                @stream.source.getHLSSnapshot (err,snapshot) =>
                    debug "HLS snapshot from initial source load"
                    @snapshot = snapshot
                    @processSnapshot snapshot

        #----------

        processSnapshot: (snapshot) ->
            return false if !snapshot

            debug "HLS Snapshot for #{@stream.key} (#{snapshot.segments.length} segments)"
            debug "Rewind extents are ", @stream._rbuffer.first(), @stream._rbuffer.last()

            # are there segments to expire? (ids that are present in @segments
            # but not in the snapshot)
            for id in _.difference(Object.keys(@segments),_.map(snapshot.segments,(s) -> s.id.toString()))
                debug "Expiring segment #{id} from waveform cache"
                delete @segments[id]
                @_segDebounce.ping()

            for seg in snapshot.segments
                if !@segments[seg.id]?
                    @seg_puller.write seg
                    @segments[seg.id] = false

        #----------

        getPreview: (cb) ->
            if @preview
                cb null, @preview, @preview_json
            else
                # FIXME: eventually there could be logic here to wait
                cb new Error("No preview available")

        getWaveform: (id,cb) ->
            if @segments[id]
                cb null, @segments[id].waveform_json
            else
                cb new Error("Not found")

        #----------

        # Generate a preview that includes the snapshot and a downsampled waveform
        _updatePreview: ->
            debug "Generating preview"
            pseg_width = Math.ceil( @options.preview_width / @snapshot.segments.length )

            preview = []

            for seg in @snapshot.segments
                segp = if @segments[seg.id]
                    # generate an actual waveform...
                    @segments[seg.id].wavedata.resample(pseg_width).adapter.data
                else
                    # generate zeros...
                    _(pseg_width*2).times(() => 0)

                preview.push _.extend {}, seg, preview:segp

            @preview = preview
            @preview_json = JSON.stringify @preview
            @emit "preview", @preview, @preview_json
            debug "Preview generation complete"

    #----------
