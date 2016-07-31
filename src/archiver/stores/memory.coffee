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

    store: (segment) ->
        debug "Storing #{segment.id} from #{@stream.key}"
        @segments[segment.id] = segment
        @index.push segment.id
        delete @queue[segment.id];
        if @index.length > @options.size
            @expire()
        debug "#{@index.length} segments in memory from #{@stream.key}"

    #----------

    expire: () ->
        id = @index.shift()
        delete @segments[id]
        debug "Expired segment #{id} from #{@stream.key}"

    #----------

    getById: (id) ->
        debug "Getting #{id} from #{@stream.key}"
        return @segments[id]

    #----------

    get: (options) ->
        first = _.first @index
        last = _.last @index
        from = @parseId options.from, first
        to = @parseId options.to, last
        debug "Searching #{from} -> #{to} from #{@stream.key}"
        return [] if from < first or to <= first
        return _.values _.pick(@segments, _.filter(@index, (id) => id >= from and id < to))

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
