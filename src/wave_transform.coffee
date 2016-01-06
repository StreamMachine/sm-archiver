waveform    = require "waveform"
temp        = require "temp"
fs          = require "fs"
execFile    = require("child_process").execFile

module.exports = class WaveTransform extends require("stream").Transform
    constructor: (@waveBin,@width)->
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
                    execFile @waveBin, [info.path,"--wjs-width",@width,"--scan"], (err,stdout,stderr) =>
                        if err
                            console.error "waveform error: #{err}"
                            cb()
                            return false

                        fs.unlink info.path, (err) =>
                            obj.waveform = JSON.parse stdout
                            obj.waveform_json = stdout
                            @push obj

                            cb()
