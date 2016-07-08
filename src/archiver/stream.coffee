_ = require "underscore"

AudioTransformer = require "./transformers/audio"
WaveformTransformer = require "./transformers/waveform"
MomentTransformer = require "./transformers/moment"
WavedataTransformer = require "./transformers/wavedata"
PreviewTransformer = require "./transformers/preview"

S3Store = require "./stores/s3"
S3StoreTransformer = require "./transformers/stores/s3"
MemoryStore = require "./stores/memory"
IdsMemoryStoreTransformer = require "./transformers/stores/memory/ids"
SegmentsMemoryStoreTransformer = require "./transformers/stores/memory/segments"

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
        @snapshot = null

        @transformers = [
            new AudioTransformer(@stream),
            new WaveformTransformer(@options.pixels_per_second),
            new MomentTransformer()
        ]

        if @options.stores?.s3?.enabled
            @stores.s3 = new S3Store(@stream,@options.stores.s3)
            @transformers.push new S3StoreTransformer(@stores.s3)

        if @options.stores?.memory?.enabled
            @stores.memory = new MemoryStore(@options.stores.memory)
            @transformers.unshift new IdsMemoryStoreTransformer(@stores.memory)
            @transformers.push new SegmentsMemoryStoreTransformer(@stores.memory)

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
            for segment in @snapshot.segments
                if not @stores.memory?.hasId segment.id
                    _.first(@transformers).write segment

        debug("Created")

    #----------

    getPreview: (options, cb) ->
        @getPreviewFromMemory options,(err,preview) =>
            return cb(err,preview) if err or (preview and preview.length)
            @getPreviewFromS3 options,(err,preview) =>
                return cb(err,preview) if err or (preview and preview.length)
                return cb null,[]

    #----------

    getPreviewFromMemory: (options, cb) ->
        return cb() if !@stores.memory
        @generatePreview @stores.memory.getSegments(options),cb

    #----------

    getPreviewFromS3: (options, cb) ->
        return cb() if !@stores.s3
        @stores.s3.getSegments(options)
            .catch(() => return [])
            .then((segments) => @generatePreview(segments,cb))

    #----------

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
        @getWaveformFromMemory id,(err,waveform) =>
            return cb(err,waveform) if err or waveform
            @getWaveformFromS3 id,(err,waveform) =>
                return cb(err,waveform) if err or waveform
                return cb new Error("Not found")

    #----------

    getAudio: (id,format,cb) ->
        @getAudioFromMemory id,format,(err,audio) =>
            return cb(err,audio) if err or audio
            @getAudioFromS3 id,format,(err,audio) =>
                return cb(err,audio) if err or audio
                return cb new Error("Not found")

    #----------

    getWaveformFromMemory: (id,cb) ->
        return cb() if !@stores.memory
        cb(null, @stores.memory.getSegmentById(id)?.waveform)

    #----------

    getAudioFromMemory: (id,format,cb) ->
        return cb() if !@stores.memory
        cb(null, @stores.memory.getSegmentById(id)?.audio)

    #----------

    getWaveformFromS3: (id,cb) ->
        return cb() if !@stores.s3
        @stores.s3.getSegmentById(id) \
            .then((segment) -> return cb(null, segment.waveform)) \
            .catch(() -> cb())

    #----------

    getAudioFromS3: (id,format,cb) ->
        return cb() if !@stores.s3
        @stores.s3.getAudioBySegmentId(id,format) \
            .then((audio) -> return cb(null, audio)) \
            .catch(() -> cb())

    #----------

#----------
