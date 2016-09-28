debug = require("debug") "sm:archiver:transformers:id"

class IdTransformer extends require("stream").Transform
    constructor: (@stream) ->
        super objectMode: true
        debug "Created for #{@stream.key}"

    #----------

    _transform: (segment, encoding, callback) ->
        id = segment.ts_actual.valueOf()
        debug "Segment #{segment.id} -> #{id} from #{@stream.key}"
        segment.id = id
        @push segment
        callback()

    #----------

#----------

module.exports = IdTransformer
