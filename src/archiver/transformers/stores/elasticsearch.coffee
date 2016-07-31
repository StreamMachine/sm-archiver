debug = require("debug") "sm:archiver:transformers:elasticsearch"

class ElasticsearchStoreTransformer extends require("stream").Transform
    constructor: (@stream, @elasticsearch) ->
        super objectMode: true
        debug "Created for #{@stream.key}"

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id} from #{@stream.key}"
        @elasticsearch.indexSegment(segment).then =>
            @push segment
            callback()

    #----------

#----------

module.exports = ElasticsearchStoreTransformer
