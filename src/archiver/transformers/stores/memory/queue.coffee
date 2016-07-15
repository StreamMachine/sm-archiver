debug = require("debug")("sm:archiver:transformers:stores:memory:queue")

module.exports = class QueueMemoryStoreTransformer extends require("stream").Transform
    constructor: (@memory,@options)->
        super objectMode:true
        debug "Created"

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id}"
        if @memory.has segment
            debug "Skipping #{segment.id}"
        else
            @memory.enqueue segment
            @push segment
        callback()

    #----------

#----------
