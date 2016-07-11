_ = require "underscore"
moment = require "moment"

debug = require("debug")("sm:archiver:stores:memory")

module.exports = class MemoryStore
    constructor:(@options) ->
        @ids = []
        @index = {}
        @segments = {}
        debug "Created"

    #----------

    hasId: (id) ->
        return id in @ids

    #----------

    getSegmentById: (id) ->
        debug "Getting #{id}"
        return @segments[id]

    #----------

    storeId: (id) ->
        if @hasId id
            return false
        @ids.push id
        return true

    #----------

    getSegments: (options) ->
        options = _.clone(options or {})
        options.from = if options.from then moment(options.from).valueOf() else -1
        options.to = if options.to then moment(options.to).valueOf() else Infinity
        index = Object.keys(@index)
        min = _.min index
        segments = []
        return segments if options.to <= min
        return segments if options.from != -1 and options.from < min
        debug "Searching from #{options.from} to #{options.to}"
        return index.sort().reduce(((segments,moment) => @_reduce(segments,moment,options)), segments)

    #----------

    _reduce: (segments,moment,options) =>
        if moment >= options.from and moment <= options.to
            segments.push @segments[@index[moment]]
        return segments

    #----------

    storeSegment: (segment) ->
        if @hasId segment.id
            @segments[segment.id] = segment
            @index[moment(segment.ts).valueOf()] = segment.id
            return if Object.keys(@segments).length <= @options.size
            deletedId = @ids.shift()
            return if not @segments[deletedId]
            delete @index[moment(@segments[deletedId].ts).valueOf()]
            delete @segments[deletedId]
            debug "Expired segment #{deletedId}"

    #----------

    deleteSegment: (id) ->
        segment = @segments[id]
        return if not segment
        delete @index[segment.ts.valueOf()]
        delete @segments[id]
        debug "Expired segment #{id}"

#----------
