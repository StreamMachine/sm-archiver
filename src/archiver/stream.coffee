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
HlsOutput = require "./outputs/hls"
debug = require("debug") "sm:archiver:stream"
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
    "preview",
    "comment"
]

class StreamArchiver extends require("events").EventEmitter
    constructor: (@stream, @options) ->
        @stores = {}
        @transformers = [
            new AudioTransformer(@stream),
            new WaveformTransformer(@stream, @options.pixels_per_second)
        ]

        if @options.stores?.memory?.enabled
            @stores.memory = new MemoryStore @stream, @options.stores.memory
            @transformers.unshift new QueueMemoryStoreTransformer @stream, @stores.memory
            @transformers.push new MemoryStoreTransformer @stream, @stores.memory

        if @options.stores?.elasticsearch?.enabled
            @stores.elasticsearch = new ElasticsearchStore @stream, @options.stores.elasticsearch
            @transformers.push new ElasticsearchStoreTransformer @stream, @stores.elasticsearch

        if @options.stores?.s3?.enabled
            @stores.s3 = new S3Store @stream, @options.stores.s3
            @transformers.push new S3StoreTransformer @stream, @stores.s3

        @transformers.unshift new IdTransformer @stream

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
            @stream.source.getHLSSnapshot (error, snapshot) =>
                debug "HLS snapshot from initial source load of #{@stream.key} (#{snapshot.segments.length} segments)"
                @stream.emit "hls_snapshot", snapshot

        @stream.on "hls_snapshot", (snapshot) =>
            for segment in snapshot.segments
                _.first(@transformers).write segment

        debug "Created for #{@stream.key}"

    #----------

    getSegments: (options, cb) ->
        @getSegmentsFromMemory options, (error, segments) =>
            return cb error, segments if error or (segments and segments.length)
            @getSegmentsFromElasticsearch options, (error, segments) =>
                return cb error, segments if error or (segments and segments.length)
                return cb null, []

    #----------

    getSegmentsFromMemory: (options, cb) ->
        return cb() if !@stores.memory
        cb null, @stores.memory.getSegments(options)

    #----------

    getSegmentsFromElasticsearch: (options, cb) ->
        return cb() if !@stores.elasticsearch
        @stores.elasticsearch.getSegments(options)
        .then((segments) -> return cb null, segments)
        .catch(() -> cb())

    #----------

    getSegment: (id, cb) ->
        @getSegmentFromMemory id, (error, segment) =>
            return cb error, (_.pick(segment, segmentKeys.concat(["waveform"])) if segment) if error or segment
            @getSegmentFromElasticsearch id, (error, segment) =>
                return cb error, (_.pick(segment, segmentKeys.concat(["waveform"])) if segment)

    #----------

    getSegmentFromMemory: (id, cb) ->
        return cb() if !@stores.memory
        cb null, @stores.memory.getSegment(id)

    #----------

    getSegmentFromElasticsearch: (id, cb) ->
        return cb() if !@stores.elasticsearch
        @stores.elasticsearch.getSegment(id)
        .then((segment) -> return cb null, segment)
        .catch(() -> cb())

    #----------

    getPreview: (options, cb) ->
        @getSegments options, (error, segments) =>
            return cb error, segments if error or not segments or not segments.length
            @generatePreview segments, (error, preview) =>
                return cb error, preview if error or (preview and preview.length)
                return cb null, []

    #----------

    generatePreview: (segments, cb) ->
        preview = []
        return cb(null, preview) if not segments.length
        wavedataTransformer = new WavedataTransformer @stream
        previewTransformer = new PreviewTransformer @stream, @options.preview_width,segments.length
        wavedataTransformer.pipe previewTransformer
        previewTransformer.on "readable", =>
            while segment = previewTransformer.read()
                preview.push _.pick(segment, segmentKeys)
        previewTransformer.on "end", =>
            cb null, preview
        _.each segments, (segment) =>
            wavedataTransformer.write segment
        previewTransformer.end()

    #----------

    getWaveform: (id, cb) ->
        @getWaveformFromMemory id, (error, waveform) =>
            return cb error, waveform if error or waveform
            @getWaveformFromElasticsearch id, cb

    #----------

    getWaveformFromMemory: (id, cb) ->
        return cb() if !@stores.memory
        cb null, @stores.memory.getWaveform(id)

    #----------

    getWaveformFromElasticsearch: (id, cb) ->
        return cb() if !@stores.elasticsearch
        @stores.elasticsearch.getSegment(id) \
            .then((segment) -> return cb null, segment?.waveform) \
            .catch(() -> cb())

    #----------

    getAudio: (id, format, cb) ->
        @getAudioFromMemory id, format, (error, audio) =>
            return cb error, audio if error or audio
            @getAudioFromS3 id, format, cb

    #----------

    getAudioFromMemory: (id, format, cb) ->
        return cb() if !@stores.memory
        cb null, @stores.memory.getAudio(id)

    #----------

    getAudioFromS3: (id, format, cb) ->
        return cb() if !@stores.s3
        @stores.s3.getAudioById(id, format) \
            .then((audio) -> return cb null, audio) \
            .catch(() -> cb())

    #----------

    getComment: (id, cb) ->
        @getCommentFromMemory id, (error, comment) =>
            return cb error, comment if error or comment
        @getCommentFromElasticsearch id, cb

    #----------

    getCommentFromMemory: (id, cb) ->
        return cb() if !@stores.memory
        cb null, @stores.memory.getComment(id)

    #----------

    getCommentFromElasticsearch: (id, cb) ->
        return cb() if !@stores.elasticsearch
        @stores.elasticsearch.getSegment(id) \
        .then((segment) -> return cb null, segment?.comment) \
        .catch(() -> cb())

    #----------

    getComments: (options, cb) ->
        @getCommentsFromElasticsearch options, (error, comments) =>
            return cb error, comments if error or (comments and comments.length)
            return cb null, []

    #----------

    getCommentsFromElasticsearch: (options, cb) ->
        return cb() if !@stores.elasticsearch
        @stores.elasticsearch.getComments(options) \
        .then((comments) => cb null, comments)
        .catch cb

    #----------

    saveComment: (comment, cb) ->
        @saveCommentToMemory comment, (error, comment) =>
            return cb error, comment if error
            @saveCommentToElasticsearch comment, cb

    #----------

    saveCommentToMemory: (comment, cb) ->
        return cb null, comment if !@stores.memory
        @stores.memory.storeComment comment
        cb null, comment

    #----------

    saveCommentToElasticsearch: (comment, cb) ->
        return cb null, comment if !@stores.elasticsearch
        @stores.elasticsearch.indexComment(comment) \
        .then(() => cb null, comment)
        .catch cb

    #----------

    getHls: (options, cb) ->
        @getSegments options, (error, segments) =>
            return cb error, segments if error or not segments or not segments.length
            @generateHls segments, cb

    #----------

    generateHls: (segments, cb) ->
        hls = new HlsOutput @stream
        try
            cb null, hls.append(segments, true).end()
        catch error
            cb error

    #----------

#----------

module.exports = StreamArchiver
