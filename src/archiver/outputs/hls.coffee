m3u = require "m3u"
_ = require "underscore"
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
        return @ if not segments.length
        if not @length
            @mediaSequence _.first(segments).id
            @comment "EXT-X-DISCONTINUITY-SEQUENCE:3"
            @comment "EXT-X-INDEPENDENT-SEGMENTS"
        _.each segments, (segment) ->
            return if @length == @max
            @programDateTime segment.ts.toISOString()
            @file "/#{@stream.key}/ts/#{segment.id}.#{@stream.opts.format}", segment.duration / 1000
            @length++
        , @
        @endlist()
        debug "Current length for #{@stream.key} is #{@length}"
        @

#----------

module.exports = HlsOutput
