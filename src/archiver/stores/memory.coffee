_ = require "underscore"

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
        return @segments[id]

    #----------

    getSegments: (options) ->
        options = _.clone(options or {})
        options.from = options.from?.valueOf() or -1
        options.to = options.to?.valueOf() or Infinity
        index = Object.keys(@index)
        min = _.min index
        segments = []
        return segments if options.to <= min
        return segments if options.from != -1 and options.from < min
        return index.sort().reduce(((segments,moment) => @_reduce(segments,moment,options)), segments)

    #----------

    _reduce: (segments,moment,options) =>
        if moment >= options.from and moment <= options.to
            segments.push @segments[@index[moment]]
        return segments

    #----------

    storeId: (id) ->
        if not @hasId id
            @ids.push id

    #----------

    storeSegment: (segment) ->
        if @hasId segment.id
            @segments[segment.id] = segment
            @index[segment.moment.valueOf()] = segment.id
            return if @ids.length <= @options.length
            deletedId = @ids.shift()
            delete @index[@segments[deletedId].moment.valueOf()]
            delete @segments[deletedId]
            debug "Expired segment #{deletedId}"

    #----------

    deleteSegment: (id) ->
        segment = @segments[id]
        return if not segment
        delete @index[segment.moment.valueOf()]
        delete @segments[id]
        debug "Expired segment #{id}"

#----------
