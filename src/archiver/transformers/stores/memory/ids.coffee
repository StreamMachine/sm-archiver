debug = require("debug")("sm:archiver:transformers:stores:memory:ids")

module.exports = class IdsMemoryStoreTransformer extends require("stream").Transform
    constructor: (@memory,@options)->
        super objectMode:true
        debug("Created")

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id}"
        @memory.storeId segment.id
        @push segment
        callback()

    #----------

#----------
