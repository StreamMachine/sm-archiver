waveform    = require "waveform"
temp        = require "temp"
fs          = require "fs"

module.exports = class WaveTransform extends require("stream").Transform
    constructor: ->
        super objectMode:true

    #----------

    _transform: (obj,encoding,cb) ->
        # create tempfile
        temp.open 'sm-archive', (err,info) =>
            if err
                console.error "Tempfile error: #{err}"
                cb()
                return false

            fs.write info.fd, obj.cbuf, 0, obj.cbuf.length, null, (err) =>
                if err
                    console.error "fd.write error: #{err}"
                    cb()
                    return false

                fs.close info.fd, (err) =>

                    waveform info.path,
                        scan:           false
                        waveformjs:     "-"
                        'wjs-width':    200
                    , (err,stdout) =>
                        if err
                            console.error "waveform error: #{err}"
                            cb()
                            return false

                        fs.unlink info.path, (err) =>

                            wavedata = JSON.parse stdout

                            obj.wavedata = wavedata
                            @push obj

                            cb()
