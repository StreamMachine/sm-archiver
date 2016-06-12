waveform    = require "sm-waveform"
WaveformData = require "waveform-data"
PassThrough = require("stream").PassThrough

debug = require("debug")("sm:archiver:transformers:waveform")

module.exports = class WaveformTransformer extends require("stream").Transform
    constructor: (@pps)->
        super objectMode:true

    #----------

    _transform: (obj,encoding,cb) ->
        pt = new PassThrough()
        debug "In WaveformTransformer for #{obj.id}"
        new waveform.Waveform pt, pixelsPerSecond:@pps, (err,wave) =>
            return cb err if err
            obj.waveform = wave.asJSON()
            obj.waveform_json = JSON.stringify(obj.waveform)
            obj.wavedata = WaveformData.create obj.waveform
            @push obj
            cb()
        pt.end obj.cbuf

    #----------
