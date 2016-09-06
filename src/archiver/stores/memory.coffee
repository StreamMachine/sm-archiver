_ = require "underscore"
moment = require "moment"
debug = require("debug") "sm:archiver:stores:memory"
R_TIMESTAMP = /^[1-9][0-9]*$/

class MemoryStore
    constructor: (@stream, @options) ->
        @queue = {}
        @segments = {}
        @index = []
        debug "Created for #{@stream.key}"

    #----------

    has: (segment) ->
        return @queue[segment.id]? or @segments[segment.id]?

    #----------

    enqueue: (segment) ->
        debug "Enqueuing #{segment.id} from #{@stream.key}"
        @queue[segment.id] = segment

    #----------

    storeSegment: (segment) ->
        debug "Storing segment #{segment.id} from #{@stream.key}"
        @segments[segment.id] = segment
        @index.push segment.id
        delete @queue[segment.id];
        if @index.length > @options.size
            @expire()
        debug "#{@index.length} segments in memory from #{@stream.key}"

    #----------

    storeComment: (comment) ->
        debug "Storing comment #{comment.id} from #{@stream.key}"
        return if not @has id: comment.id
        @segments[comment.id].comment = comment

    #----------

    expire: () ->
        id = @index.shift()
        delete @segments[id]
        debug "Expired segment #{id} from #{@stream.key}"

    #----------

    getSegment: (id) ->
        @getOne id

    #----------

    getWaveform: (id) ->
        @getOne id, "waveform"

    #----------

    getAudio: (id) ->
        @getOne id, "audio"

    #----------

    getComment: (id) ->
        @getOne id, "comment"

    #----------

    getOne: (id, attribute) ->
        debug "Getting #{attribute or "segment"} #{id} from #{@stream.key}"
        if attribute then @segments[id]?[attribute] else @segments[id]

    #----------

    getSegments: (options) ->
        @getMany options

    #----------

    getComments: (options) ->
        @getMany options, "comment"

    #----------

    getMany: (options, attribute) ->
        first = _.first @index
        last = _.last @index
        from = @parseId options.from, first
        to = @parseId options.to, last
        debug "Searching #{attribute or "segment"}s #{from} -> #{to} from #{@stream.key}"
        return [] if from < first or to <= first
        segments = _.values _.pick(@segments, _.filter(@index, (id) => id >= from and id < to))
        if attribute then _.pluck segments, attribute else segments

    #----------

    parseId: (id, defaultId) ->
        if not id
            return defaultId
        if R_TIMESTAMP.test(id)
            return Number(id)
        moment(id).valueOf()

    #----------

#----------

module.exports = MemoryStore
