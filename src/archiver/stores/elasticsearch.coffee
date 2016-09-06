P = require "bluebird"
_ = require "underscore"
moment = require "moment"
elasticsearch = require "elasticsearch"
debug = require("debug") "sm:archiver:stores:elasticsearch"
R_TIMESTAMP = /^[1-9][0-9]*$/
segmentKeys = [
    "id",
    "ts",
    "end_ts",
    "ts_actual",
    "end_ts_actual",
    "data_length",
    "duration",
    "discontinuitySeq",
    "pts",
    "waveform"
]

class ElasticsearchStore
    constructor: (@stream, options) ->
        @options = _.clone options
        _.extend @, new elasticsearch.Client(@options)
        @hours = @options.size / 60 / 6
        debug "Created for #{@stream.key}"

    #----------

    indexSegment: (segment) ->
        @indexOne "segment", segment.id, _.pick(segment, segmentKeys)

    #----------

    indexComment: (comment) ->
        @indexOne "comment", comment.id, comment

    #----------

    indexOne: (type, id, body) ->
        debug "Indexing #{type} #{id}"
        @index(index: @stream.key, type: type, id: id, body: body) \
        .catch (error) =>
            debug "INDEX #{type} Error for #{@stream.key}/#{id}: #{error}"

    #----------

    getSegment: (id, fields) ->
        @getOne "segment", id, fields

    #----------

    getComment: (id, fields) ->
        @getOne "comment", id, fields

    #----------

    getOne: (type, id, fields) ->
        debug "Getting #{type} #{id} from #{@stream.key}"
        @get(index: @stream.key, type: type, id: id, fields: fields)
        .then((result) => result._source ) \
        .catch (error) =>
            debug "GET #{type} Error for #{@stream.key}/#{id}: #{error}"

    #----------

    getSegments: (options) ->
        @getMany "segment", options

    #----------

    getComments: (options) ->
        @getMany "comment", options

    #----------

    getMany: (type, options) ->
        first = moment().subtract(@hours, 'hours').valueOf()
        last = moment().valueOf()
        from = @parseId options.from, first
        to = @parseId options.to, last
        debug "Searching #{type} #{from} -> #{to} from #{@stream.key}"
        @search(index: @stream.key, type: type, body: {
            size: @options.size,
            sort: "id",
            query: {
                range: {
                    id: {
                        gte: from,
                        lt: to
                    }
                }
            }
        }) \
        .then((result) => P.map(result.hits.hits, (hit) => hit._source)) \
        .catch (error) =>
            debug "SEARCH #{type} Error for #{@stream.key}: #{error}"

    #----------

    parseId: (id, defaultId) ->
        if not id
            return defaultId
        if R_TIMESTAMP.test(id)
            return Number(id)
        moment(id).valueOf()

    #----------

#----------

module.exports = ElasticsearchStore
