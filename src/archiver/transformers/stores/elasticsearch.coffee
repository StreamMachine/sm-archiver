debug = require("debug")("sm:archiver:transformers:stores:elasticsearch")

module.exports = class ElasticsearchStoreTransformer extends require("stream").Transform
    constructor: (@elasticsearch)->
        super objectMode:true
        debug "Created"

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id}"
        @elasticsearch.indexSegment(segment).then =>
            @push segment
            callback()

    #----------

#----------
