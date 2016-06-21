P = require "bluebird"
_ = require "underscore"
moment = require "moment"
S3Store = require "../stores/s3"

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
        ts = moment(segment.ts)
        year = String(ts.year())
        month = String(ts.month() + 1)
        date = String(ts.date())
        hour = String(ts.hour())
        minute = String(ts.minute())
        second = String(ts.second())
        key = "#{year}/#{month}/#{date}/#{hour}/#{minute}/#{second}"
        return P.all([
            @s3.putFileIfNotExists("#{@s3.prefix}/#{key}.json", JSON.stringify(_.pick(segment, segmentKeys)), ContentType:'application/json'),
            @s3.putFileIfNotExists("#{@s3.prefix}/#{key}.#{@s3.format}", segment.cbuf),
            @s3.putFileIfNotExists("#{@s3.prefix}/index/segments/#{segment.id}", key)
        ])

    #----------
