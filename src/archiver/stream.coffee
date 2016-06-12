_ = require "underscore"

BufferTransformer   = require "./transformers/buffer"
WaveformTransformer   = require "./transformers/waveform"
PreviewTransformer   = require "./transformers/preview"

debug = require("debug")("sm:archiver:stream")

segmentKeys = [
    "id",
    "ts",
    "end_ts",
    "ts_actual",
    "end_ts_actual",
    "data_length",
    "duration",
    "discontinuitySeq",
    "pts",
    "preview"
]

module.exports = class StreamArchiver extends require("events").EventEmitter
    constructor: (@stream,@options) ->
        @segments = {}
        @snapshot = null
        @preview = null
        @preview_json = null

        @stores = _.mapObject(_.filter(@options.stores || [], 'enabled'), (options,store) =>
            debug "Creating #{store} Store for #{@stream.key} Stream"
            return new StreamArchiver.Stores[store](@stream,options)
        )
        @transformers = [
            new BufferTransformer(@stream),
            new WaveformTransformer(@options.pixels_per_second)
        ]
        _.each @transformers, (transformer, index) =>
            previous = @transformers[index - 1];
            if (previous)
                previous.pipe(transformer)

        _.last(@transformers).on "readable", =>
            while seg = _.last(@transformers).read()
                @segments[seg.id] = seg

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

            for seg in @snapshot.segments
                if !@segments[seg.id]?
                    _.first(@transformers).write seg

    #----------

    getPreview: (cb) ->
        preview = []
        return cb(null, preview) if !@snapshot
        previewTransformer = new PreviewTransformer(@_getResampleOptions)
        previewTransformer.on "readable", =>
            while segment = previewTransformer.read()
                preview.push(_.pick(segment, segmentKeys))
        previewTransformer.on "end", =>
            cb null, preview
        _.each @snapshot.segments, (segment) =>
            previewTransformer.write(@segments[segment.id]) if @segments[segment.id]
        previewTransformer.end()

    #----------

    getWaveform: (id,cb) ->
        if @segments[id]
            cb null, @segments[id].waveform_json
        else
            cb new Error("Not found")

    #----------

    _getResampleOptions: (segment) =>
        pseg_width = Math.ceil( @options.preview_width / @snapshot.segments.length )
        if pseg_width < segment.wavedata.adapter.scale
            return scale: segment.wavedata.adapter.scale
        return width: pseg_width

    @Stores: s3:require "./stores/s3"

#----------
