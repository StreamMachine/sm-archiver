WaveformData = require "waveform-data"

debug = require("debug")("sm:archiver:transformers:wavedata")

module.exports = class WavedataTransformer extends require("stream").Transform
    constructor: ()->
        super objectMode:true
        debug("Created")

    #----------

    _transform: (obj,encoding,cb) ->
        debug "Segment #{obj.id}"
        obj.wavedata = WaveformData.create obj.waveform
        @push obj
        cb()

    #----------
