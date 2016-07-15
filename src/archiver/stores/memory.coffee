_ = require "underscore"
moment = require "moment"

debug = require("debug")("sm:archiver:stores:memory")

module.exports = class MemoryStore
    constructor:(@options) ->
        @queue = {}
        @segments = {}
        @index = []
        debug "Created"

    #----------

    has: (segment) ->
        return @queue[segment.id]? or @segments[segment.id]?

    #----------

    enqueue: (segment) ->
        debug "Enqueuing #{segment.id}"
        @queue[segment.id] = segment

    #----------

    store: (segment) ->
        debug "Storing #{segment.id}"
        @segments[segment.id] = segment
        @index.push segment.id
        delete @queue[segment.id];
        if @index.length > @options.size
            @expire()
        debug "#{@index.length} segments in memory"

    #----------

    expire: () ->
        id = @index.shift()
        delete @segments[id]
        debug "Expired segment #{id}"

    #----------

    getById: (id) ->
        debug "Getting #{id}"
        return @segments[id]

    #----------

    get: (options) ->
        options = _.clone(options or {})
        options.from = if options.from then moment(options.from).valueOf() else -1
        options.to = if options.to then moment(options.to).valueOf() else Infinity
        segments = []
        return segments if options.to <= @index[0]
        return segments if options.from != -1 and options.from < @index[0]
        debug "Searching from #{options.from} to #{options.to}"
        return _.values _.pick(@segments,_.filter(@index,(id) => id >= options.from and id < options.to))

    #----------

#----------
