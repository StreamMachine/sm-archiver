_ = require "underscore"

debug = require("debug")("sm:archiver:transformers:buffer")

module.exports = class BufferTransformer extends require("stream").Transform
    constructor: (@stream) ->
        super objectMode:true
        debug("Created")

    _transform: (seg,encoding,cb) ->
        debug "Segment #{seg.id}"
        dur = @stream.secsToOffset seg.duration / 1000
        @stream._rbuffer.range seg.ts_actual, dur, (err,chunks) =>
            if err
                console.error "Error getting segment rewind: #{err}"
                cb()
                return false

            buffers     = []
            length      = 0
            duration    = 0
            meta        = null

            for b in chunks
                length      += b.data.length
                duration    += b.duration

                buffers.push b.data

                meta = b.meta if !meta

            cbuf = Buffer.concat(buffers,length)
            @push _.extend(seg, cbuf:cbuf, duration:duration, meta:meta)
            cb()
