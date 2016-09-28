debug = require("debug") "sm:archiver:transformers:s3"

class S3StoreTransformer extends require("stream").Transform
    constructor: (@stream, @s3) ->
        super objectMode: true
        debug "Created for #{@stream.key}"

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id} from #{@stream.key}"
        @s3.putFileIfNotExists("audio/#{segment.id}.#{@s3.format}", segment.audio) \
            .finally =>
                @push segment
                callback()

    #----------

#----------

module.exports = S3StoreTransformer
