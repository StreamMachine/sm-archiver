waveform    = require "sm-waveform"
PassThrough = require("stream").PassThrough
temp        = require "temp"
fs          = require "fs"

debug = require("debug")("sm-archiver")

module.exports = class WaveTransform extends require("stream").Transform
    constructor: (@pps)->
        super objectMode:true

    #----------

    _transform: (obj,encoding,cb) ->
        pt = new PassThrough()

        debug "In WaveTransform for #{obj.id}"

        new waveform.Waveform pt, pixelsPerSecond:@pps, (err,wave) =>
            return cb err if err

            obj.waveform = wave.asJSON()
            obj.waveform_json = JSON.stringify(obj.waveform)
            @push obj

            cb()

        pt.end obj.cbuf
