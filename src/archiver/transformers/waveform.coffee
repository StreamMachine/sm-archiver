waveform    = require "sm-waveform"
PassThrough = require("stream").PassThrough
debug = require("debug") "sm:archiver:transformers:waveform"

class WaveformTransformer extends require("stream").Transform
    constructor: (@stream, @pps) ->
        super objectMode:true
        debug "Created for #{@stream.key}"

    #----------

    _transform: (segment, encoding, callback) ->
        pt = new PassThrough()
        debug "Segment #{segment.id} from #{@stream.key}"
        new waveform.Waveform pt, pixelsPerSecond: @pps, (error, waveform) =>
            return callback error if error
            segment.waveform = waveform.asJSON()
            @push segment
            callback()
        pt.end segment.audio

    #----------

#----------

module.exports = WaveformTransformer
