debug = require("debug") "sm:archiver:transformers:memory:queue"

class QueueMemoryStoreTransformer extends require("stream").Transform
    constructor: (@stream, @memory, @options) ->
        super objectMode: true
        debug "Created for #{@stream.key}"

    #----------

    _transform: (segment, encoding, callback) ->
        if @memory.has segment
            debug "Skipping #{segment.id} from #{@stream.key}"
        else
            debug "Segment #{segment.id} from #{@stream.key}"
            @memory.enqueue segment
            @push segment
        callback()

    #----------

#----------

module.exports = QueueMemoryStoreTransformer
