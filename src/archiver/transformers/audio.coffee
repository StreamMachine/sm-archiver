_ = require "underscore"
debug = require("debug") "sm:archiver:transformers:audio"

class AudioTransformer extends require("stream").Transform
    constructor: (@stream) ->
        super objectMode: true
        debug "Created for #{@stream.key}"

    #----------

    _transform: (segment,encoding,callback) ->
        duration = @stream.secsToOffset segment.duration / 1000
        debug "Segment #{segment.id} from #{@stream.key}"
        @stream._rbuffer.range segment.ts_actual, duration, (error, chunks) =>
            if error
                console.error "Error getting segment rewind: #{error}"
                callback()
                return false
            buffers = []
            length = 0
            duration = 0
            meta = null
            for chunk in chunks
                length += chunk.data.length
                duration += chunk.duration
                buffers.push chunk.data
                meta = chunk.meta if !meta
            audio = Buffer.concat buffers, length
            @push _.extend(segment, audio: audio, duration: duration, meta: meta)
            callback()

    #----------

#----------

module.exports = AudioTransformer
