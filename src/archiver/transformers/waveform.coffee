waveform    = require "sm-waveform"
PassThrough = require("stream").PassThrough

debug = require("debug")("sm:archiver:transformers:waveform")

module.exports = class WaveformTransformer extends require("stream").Transform
    constructor: (@pps)->
        super objectMode:true
        debug("Created")

    #----------

    _transform: (obj,encoding,cb) ->
        pt = new PassThrough()
        debug "Segment #{obj.id}"
        new waveform.Waveform pt, pixelsPerSecond:@pps, (err,wave) =>
            return cb err if err
            obj.waveform = wave.asJSON()
            @push obj
            cb()
        pt.end obj.audio

    #----------
