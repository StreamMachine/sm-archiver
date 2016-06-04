Debounce    = require "streammachine/js/src/streammachine/util/debounce"

WaveTransform   = require "../wave_transform"
SegmentPuller   = require "../segment_puller"

WaveformData = require "waveform-data"

_ = require "underscore"

debug = require("debug")("sm:archiver:stream")

module.exports = class StreamArchiver extends require("events").EventEmitter
    constructor: (@stream,@options) ->
        @segments = {}
        @snapshot = null
        @preview = null
        @preview_json = null

        @stores = _.mapObject(@options.stores || [], (options,store) =>
            debug "Creating #{store} Store for #{@stream.key} Stream"
            return new StreamArchiver.Stores[store](@stream,options)
        )
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
                #debug "Stashed waveform data for #{seg.id}"

        # process snapshots to look for new segments
        @stream.source.on "hls_snapshot", (snapshot) =>
            debug "HLS Snapshot received via broadcast from #{@stream.key}"
            @stream.emit "hls_snapshot", snapshot

        @stream._once_source_loaded =>
            @stream.source.getHLSSnapshot (err,snapshot) =>
                debug "HLS snapshot from initial source load of #{@stream.key}"
                @stream.emit "hls_snapshot", snapshot

        @stream.on "hls_snapshot", (snapshot) =>
            debug "HLS Snapshot for #{@stream.key} (#{snapshot.segments.length} segments)"
            debug "Rewind extents are ", @stream._rbuffer.first(), @stream._rbuffer.last()
            @snapshot = snapshot
            # are there segments to expire? (ids that are present in @segments
            # but not in the snapshot)
            for id in _.difference(Object.keys(@segments),_.map(@snapshot.segments,(s) -> s.id.toString()))
                debug "Expiring segment #{id} from waveform cache"
                delete @segments[id]
                @_segDebounce.ping()

            for seg in @snapshot.segments
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
        preview = []

        for seg in @snapshot.segments
            resample_options = @_getResampleOptions seg.id
            segp = if @segments[seg.id]
                # generate an actual waveform...
                @segments[seg.id].wavedata.resample(resample_options).adapter.data
            else
                # generate zeros...
                _(resample_options.width*2).times(() => 0)

            preview.push _.extend {}, seg, preview:segp

        @preview = preview
        @preview_json = JSON.stringify @preview
        @emit "preview", @preview, @preview_json
        debug "Preview generation complete"

    #----------

    _getResampleOptions: (id) ->
        pseg_width = Math.ceil( @options.preview_width / @snapshot.segments.length )
        if @segments[id] && pseg_width < @segments[id].wavedata.adapter.scale
            return scale: @segments[id].wavedata.adapter.scale
        return width: pseg_width

    @Stores: s3:require "./stores/s3"

#----------
