m3u = require "m3u"
_ = require "underscore"
moment = require "moment"
debug = require("debug") "sm:archiver:outputs:hls"

class HlsOutput
    constructor: (@stream) ->
        _.extend @, m3u.httpLiveStreamingWriter()
        @version 3
        @targetDuration 10
        @length = 0
        @max = 360
        debug "Created for #{@stream.key}"

    #----------

    append: (segments) ->
        return @ if not segments.length or @ended
        if not @length
            @mediaSequence _.first(segments).id
            @comment "EXT-X-INDEPENDENT-SEGMENTS"
        _.each segments, (segment) ->
            return if @length == @max
            ts = if moment.isMoment segment.ts then segment.ts else moment(segment.ts)
            @programDateTime ts.format()
            @file "/#{@stream.key}/ts/#{segment.id}.#{@stream.opts.format}", segment.duration / 1000
            @length++
        , @
        debug "Current length for #{@stream.key} is #{@length}"
        @

    #----------

    end: () ->
        @ended = true
        @endlist()
        debug "Ended for #{@stream.key}"
        @

    #----------

#----------

module.exports = HlsOutput
