WaveformData = require "waveform-data"
debug = require("debug") "sm:archiver:transformers:wavedata"

class WavedataTransformer extends require("stream").Transform
    constructor: (@stream) ->
        super objectMode: true
        debug "Created for #{@stream.key}"

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id} (#{segment.waveform.length}) from #{@stream.key}"
        segment.wavedata = WaveformData.create segment.waveform
        @push segment
        callback()

    #----------

#----------

module.exports = WavedataTransformer
