debug = require("debug") "sm:archiver:transformers:preview"

class PreviewTransformer extends require("stream").Transform
    constructor: (@stream, @width, @length) ->
        @psegWidth = Math.ceil @width / @length
        super objectMode: true
        debug "Created for #{@stream.key}"

    #----------

    _transform: (segment, encoding, callback) ->
        debug "Segment #{segment.id} from #{@stream.key}"
        options = @getResampleOptions segment
        segment.preview = segment.wavedata.resample(options).adapter.data
        @push segment
        callback()

    #----------

    getResampleOptions: (segment) =>
        if @getSamplesPerPixel(segment) < segment.wavedata.adapter.scale
            return scale: segment.wavedata.adapter.scale
        width: @psegWidth

    #----------

    getSamplesPerPixel: (segment) =>
        Math.floor segment.wavedata.duration * segment.wavedata.adapter.sample_rate / @psegWidth

    #----------

#----------

module.exports = PreviewTransformer
