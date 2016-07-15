moment = require "moment"

debug = require("debug")("sm:archiver:transformers:id")

module.exports = class IdTransformer extends require("stream").Transform
    constructor: ()->
        super objectMode:true
        debug "Created"

#----------

    _transform: (segment, encoding, callback) ->
        id = moment(segment.ts).valueOf()
        debug "Segment #{segment.id} -> #{id}"
        segment.id = id
        @push segment
        callback()

#----------

#----------
