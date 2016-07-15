_ = require "underscore"

IdTransformer = require "./transformers/id"
AudioTransformer = require "./transformers/audio"
WaveformTransformer = require "./transformers/waveform"
WavedataTransformer = require "./transformers/wavedata"
PreviewTransformer = require "./transformers/preview"

MemoryStore = require "./stores/memory"
QueueMemoryStoreTransformer = require "./transformers/stores/memory/queue"
MemoryStoreTransformer = require "./transformers/stores/memory"
ElasticsearchStore = require "./stores/elasticsearch"
ElasticsearchStoreTransformer = require "./transformers/stores/elasticsearch"
S3Store = require "./stores/s3"
S3StoreTransformer = require "./transformers/stores/s3"

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

        @transformers = [
            new AudioTransformer(@stream),
            new WaveformTransformer(@options.pixels_per_second)
        ]

        if @options.stores?.memory?.enabled
            @stores.memory = new MemoryStore(@options.stores.memory)
            @transformers.unshift new QueueMemoryStoreTransformer(@stores.memory)
            @transformers.push new MemoryStoreTransformer(@stores.memory)

        if @options.stores?.elasticsearch?.enabled
            @stores.elasticsearch = new ElasticsearchStore(@stream,@options.stores.elasticsearch)
            @transformers.push new ElasticsearchStoreTransformer(@stores.elasticsearch)

        if @options.stores?.s3?.enabled
            @stores.s3 = new S3Store(@stream,@options.stores.s3)
            @transformers.push new S3StoreTransformer(@stores.s3)

        @transformers.unshift new IdTransformer()

        _.each @transformers, (transformer, index) =>
            previous = @transformers[index - 1];
            if (previous)
                previous.pipe(transformer)

        _.last(@transformers).on "readable", =>
            while seg = _.last(@transformers).read()
                debug "Segment #{seg.id} archived"

        @stream.source.on "hls_snapshot", (snapshot) =>
            debug "HLS Snapshot received via broadcast from #{@stream.key} (#{snapshot.segments.length} segments)"
            @stream.emit "hls_snapshot", snapshot

        @stream._once_source_loaded =>
            @stream.source.getHLSSnapshot (err,snapshot) =>
                debug "HLS snapshot from initial source load of #{@stream.key} (#{snapshot.segments.length} segments)"
                @stream.emit "hls_snapshot", snapshot

        @stream.on "hls_snapshot", (snapshot) =>
            for segment in snapshot.segments
                _.first(@transformers).write segment

        debug "Created"

    #----------

    getPreview: (options, cb) ->
        @getPreviewFromMemory options,(err,preview) =>
            return cb(err,preview) if err or (preview and preview.length)
            @getPreviewFromElasticsearch options,(err,preview) =>
                return cb(err,preview) if err or (preview and preview.length)
                return cb null,[]

    #----------

    getPreviewFromMemory: (options, cb) ->
        return cb() if !@stores.memory
        @generatePreview @stores.memory.get(options),cb

    #----------

    getPreviewFromElasticsearch: (options,cb) ->
        return cb() if !@stores.elasticsearch
        @stores.elasticsearch.getSegments(options) \
            .catch(() -> [])
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
            @getWaveformFromElasticsearch id,cb

    #----------

    getWaveformFromMemory: (id,cb) ->
        return cb() if !@stores.memory
        cb(null, @stores.memory.getById(id)?.waveform)

    #----------

    getWaveformFromElasticsearch: (id,cb) ->
        return cb() if !@stores.elasticsearch
        @stores.elasticsearch.getSegmentById(id) \
            .then((segment) -> return cb(null, segment?.waveform)) \
            .catch(() -> cb())

    #----------

    getAudio: (id,format,cb) ->
        @getAudioFromMemory id,format,(err,audio) =>
            return cb(err,audio) if err or audio
            @getAudioFromS3 id,format,cb

    #----------

    getAudioFromMemory: (id,format,cb) ->
        return cb() if !@stores.memory
        cb(null, @stores.memory.getById(id)?.audio)

    #----------

    getAudioFromS3: (id,format,cb) ->
        return cb() if !@stores.s3
        @stores.s3.getAudioById(id,format) \
            .then((audio) -> return cb(null, audio)) \
            .catch(() -> cb())

    #----------

#----------
