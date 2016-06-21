_ = require "underscore"

BufferTransformer = require "./transformers/buffer"
WaveformTransformer = require "./transformers/waveform"
WavedataTransformer = require "./transformers/wavedata"
PreviewTransformer = require "./transformers/preview"
S3StoreTransformer = require "./transformers/s3"
S3Store = require "./stores/s3"

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
        @stores = {}
        @segments = {}
        @snapshot = null

        @transformers = [
            new BufferTransformer(@stream),
            new WaveformTransformer(@options.pixels_per_second)
        ]

        if @options.stores?.s3?.enabled
            @stores.s3 = new S3Store(@stream,@options.stores.s3)
            @transformers.push new S3StoreTransformer(@stores.s3)

        _.each @transformers, (transformer, index) =>
            previous = @transformers[index - 1];
            if (previous)
                previous.pipe(transformer)

        _.last(@transformers).on "readable", =>
            while seg = _.last(@transformers).read()
                debug "Segment #{seg.id} archived"

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

            for id in _.difference(Object.keys(@segments),_.map(@snapshot.segments,(s) -> s.id.toString()))
                debug "Expiring segment #{id} from cache"
                delete @segments[id]

            for seg in @snapshot.segments
                if !@segments[seg.id]
                    @segments[seg.id] = seg
                    _.first(@transformers).write seg

        debug("Created")

    #----------

    getPreview: (options, cb) ->
        return cb(null, []) if !@snapshot
        snapshot = _.map @snapshot.segments,(segment) =>
            return @segments[segment.id]
        segments = _.filter snapshot,(segment) =>
            return segment?.waveform
        @generatePreview segments,cb

    generatePreview: (segments,cb) ->
        preview = []
        wavedataTransformer = new WavedataTransformer
        previewTransformer = new PreviewTransformer @options.preview_width,segments.length
        wavedataTransformer.pipe previewTransformer
        previewTransformer.on "readable", =>
            while segment = previewTransformer.read()
                preview.push(_.pick(segment, segmentKeys))
        previewTransformer.on "end", =>
            cb null, preview
        _.each segments, (segment) =>
            wavedataTransformer.write(segment)
        previewTransformer.end()

    #----------

    getWaveform: (id,cb) ->
        if !@stores.s3
            return cb(null, @segments[id].waveform) if !@segments[id]?.waveform
            return cb(new Error("Not found"))
        @stores.s3.getSegmentById(id) \
            .then((segment) -> return cb(null, segment.waveform)) \
            .catch(() -> return cb(new Error("Not found")))

    #----------

#----------
