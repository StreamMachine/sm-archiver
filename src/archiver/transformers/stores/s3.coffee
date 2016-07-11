P = require "bluebird"
_ = require "underscore"
moment = require "moment"

debug = require("debug")("sm:archiver:transformers:stores:s3")

module.exports = class S3StoreTransformer extends require("stream").Transform
    constructor: (@s3)->
        super objectMode:true
        debug "Created"

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id}"
        @s3.putFileIfNotExists("audio/#{segment.id}.#{@s3.format}", segment.audio) \
            .finally =>
                @push segment
                callback()

    #----------

#----------
