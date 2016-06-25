moment = require "moment"

debug = require("debug")("sm:archiver:transformers:moment")

module.exports = class MomentTransformer extends require("stream").Transform
    constructor: ()->
        super objectMode:true
        debug("Created")

    #----------

    _transform: (segment,encoding,callback) ->
        debug "Segment #{segment.id}"
        segment.moment = moment(segment.ts)
        @push segment
        callback()

    #----------
