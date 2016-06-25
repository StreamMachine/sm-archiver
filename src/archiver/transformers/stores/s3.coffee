P = require "bluebird"
_ = require "underscore"
moment = require "moment"

debug = require("debug")("sm:archiver:transformers:stores:s3")

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
    "waveform"
]

module.exports = class S3StoreTransformer extends require("stream").Transform
    constructor: (@s3)->
        super objectMode:true
        debug("Created")

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id}"
        @storeSegment(segment).finally =>
            @push segment
            callback()


    #----------

    storeSegment: (segment) ->
        key = @s3.getKey segment
        return P.all([
            @s3.putFileIfNotExists("json/#{key}.json", JSON.stringify(_.pick(segment, segmentKeys)), ContentType:'application/json'),
            @s3.putFileIfNotExists("audio/#{key}.#{@s3.format}", segment.cbuf),
            @s3.putFileIfNotExists("index/segments/#{segment.id}", key)
        ])

    #----------
