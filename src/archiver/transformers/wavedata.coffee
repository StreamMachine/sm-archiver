WaveformData = require "waveform-data"

debug = require("debug")("sm:archiver:transformers:wavedata")

module.exports = class WavedataTransformer extends require("stream").Transform
    constructor: ()->
        super objectMode:true
        debug("Created")

    #----------

    _transform: (segment,encoding,callback) ->
        debug "Segment #{segment.id}"
        segment.wavedata = WaveformData.create segment.waveform
        @push segment
        callback()

    #----------
