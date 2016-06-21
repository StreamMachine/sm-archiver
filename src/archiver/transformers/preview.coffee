debug = require("debug")("sm:archiver:transformers:preview")

module.exports = class PreviewTransformer extends require("stream").Transform
    constructor: (@width,@length)->
        @psegWidth = Math.ceil(@width / @length)
        super objectMode:true
        debug("Created")

    #----------

    _transform: (obj,encoding,cb) ->
        debug "Segment #{obj.id}"
        resample_options = @_getResampleOptions obj
        obj.preview = obj.wavedata.resample(resample_options).adapter.data
        @push obj
        cb()

    _getResampleOptions: (segment) =>
        if @psegWidth < segment.wavedata.adapter.scale
            return scale:segment.wavedata.adapter.scale
        return width:@psegWidth

    #----------
