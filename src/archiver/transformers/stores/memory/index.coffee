debug = require("debug")("sm:archiver:transformers:stores:memory")

module.exports = class MemoryStoreTransformer extends require("stream").Transform
    constructor: (@memory,@options)->
        super objectMode:true
        debug "Created"

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id}"
        @memory.store segment
        @push segment
        callback()

    #----------

#----------
