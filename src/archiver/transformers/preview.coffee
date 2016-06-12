debug = require("debug")("sm:archiver:transformers:preview")

module.exports = class PreviewTransformer extends require("stream").Transform
    constructor: (@_getResampleOptions)->
        super objectMode:true

    #----------

    _transform: (obj,encoding,cb) ->
        debug "In PreviewTransformer for #{obj.id}"
        resample_options = @_getResampleOptions obj
        obj.preview = obj.wavedata.resample(resample_options).adapter.data
        @push obj
        cb()

    #----------
