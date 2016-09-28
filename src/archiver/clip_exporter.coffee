# Functionally, this is a Pumper output but with accurate seeking inside
# the first and last buffer segments

debug = require("debug")("sm-archiver")

_ = require "underscore"

Parsers =
    aac: require "streammachine/js/src/streammachine/parsers/aac"
    mp3: require "streammachine/js/src/streammachine/parsers/mp3"

module.exports = class ClipExporter
    constructor: (@stream,@opts) ->
        # we're given start and end times. for the current rewind buffer API,
        # we need to convert those into start and length to use the range
        # function

        start_time = new Date(@opts.req.query.start)
        end_time = new Date(@opts.req.query.end)

        start_offset = @stream._rbuffer._findTimestampOffset start_time
        end_offset = @stream._rbuffer._findTimestampOffset end_time

        debug "Start/End offsets are #{start_offset}/#{end_offset}", start_time.toISOString(), end_time.toISOString()

        @stream._rbuffer.range start_offset, (start_offset-end_offset)+1, (err,chunks) =>
            if err
                @opts.res.status(500).end(err)
                return false

            # we're going to need to chop some amount of data off the front and end
            # of the given chunks

            debug "chunks length is #{chunks.length}"

            trim_start = Number(start_time) - Number(chunks[0].ts)
            trim_end = Number(chunks[chunks.length-1].ts) + chunks[chunks.length-1].duration - Number(end_time)

            debug "Start/end trims are #{ trim_start } / #{ trim_end }", chunks[0].ts.toISOString(), chunks[chunks.length-1].ts.toISOString(), chunks[chunks.length-1].duration
            filename = @stream.key+'-'+Date.now()+'.'+@stream.opts.format
            aF = _.after 2, =>
                debug "Chunk trimming complete."
                # -- what's the total size? -- #

                content_length = 0
                content_length += c.data.length for c in chunks

                # -- feed our response -- #

                @opts.res.writeHead 200,
                    "Content-Type":
                        if @stream.opts.format == "mp3"         then "audio/mpeg"
                        else if @stream.opts.format == "aac"    then "audio/aacp"
                        else "unknown"
                    "Connection":           "close"
                    "Content-Length":       content_length
                    "Content-Disposition":  'attachment; filename="'+filename+'"'
                    "X-Archiver-Filename":  filename

                stream = new ClipExporter.ChunkStream chunks

                stream.pipe(@opts.res)

            # -- trim initial / end chunks -- #

            @trim chunks[0], trim_start, (err,c) =>
                debug "After trimming, chunk[0] is #{ c.data.length }"
                chunks[0] = c if !err
                aF()

            @trim chunks[chunks.length-1], -1*trim_end, (err,c) =>
                debug "After trimming, chunk[-1] is #{ c.data.length }"
                chunks[chunks.length-1] = c if !err
                aF()

    #----------

    trim: (chunk,amount,cb) ->
        skippedBytes = 0
        skippedDuration = 0
        bufs = []
        bufLen = 0

        new_ts = null

        # short-circuit if we aren't meant to do anything
        if amount == 0
            cb null, chunk
            return false

        # -- create a parser -- #

        parser = new Parsers[@stream.opts.format]

        if amount > 0
            writing = false
            # skip from the beginning
            parser.on "frame", (frame,header) =>
                if writing
                        bufs.push(frame)
                        bufLen += frame.length
                else
                    if skippedDuration + header.duration > amount
                        # we've skipped enough. start writing
                        writing = true

                        bufs.push(frame)
                        bufLen += frame.length

                        new_ts = new Date( Number(chunk.ts) + skippedDuration )

                    else
                        skippedBytes += frame.length
                        skippedDuration += header.duration

        if amount < 0
            # skip from the end
            targetDuration = chunk.duration + amount
            bufDuration = 0

            # initial ts isn't changing, just duration
            new_ts = chunk.ts

            parser.on "frame", (frame,header) =>
                if bufDuration > targetDuration
                    skippedDuration += header.duration
                    skippedBytes += frame.length
                else
                    bufs.push frame
                    bufLen += frame.length
                    bufDuration += header.duration

        parser.on "end", =>
            # re-assemble our chunk with the new info
            buf = Buffer.concat(bufs,bufLen)

            debug "Trim skipped #{ skippedBytes } bytes and #{ skippedDuration }ms"

            new_chunk =
                ts: new_ts
                duration: chunk.duration - skippedDuration
                data: buf

            cb null, new_chunk

        parser.end chunk.data

    #----------

    class @ChunkStream extends require("stream").Readable
        constructor: (@data) ->
            @pos = 0
            @sentBytes = 0
            super()

        _read: (size) ->
            sent = 0
            _pushQueue = =>
                if @pos == @data.length
                    @push null
                    return false

                chunk = @data[@pos]
                @pos += 1
                sent += chunk.data.length
                @sentBytes += chunk.data.length

                if @push chunk.data
                    _pushQueue() if sent < size
                else
                    @emit "readable"

            _pushQueue()
