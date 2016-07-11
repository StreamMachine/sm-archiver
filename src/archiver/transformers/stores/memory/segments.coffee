debug = require("debug")("sm:archiver:transformers:stores:memory:segments")

module.exports = class SegmentsMemoryStoreTransformer extends require("stream").Transform
    constructor: (@memory,@options)->
        super objectMode:true
        debug "Created"

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id}"
        @memory.storeSegment segment
        @push segment
        callback()

    #----------

#----------
