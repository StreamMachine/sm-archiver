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
        debug "Indexing #{segment.id} from #{@stream.key}"
        @index(index: @stream.key, type: "segment", id: segment.id, body: _.pick(segment, segmentKeys)) \
            .catch (error) =>
                debug "INDEX Error for #{@stream.key}/#{segment.id}: #{error}"

    #----------

    getSegmentById: (id, fields) ->
        debug "Getting #{id} from #{@stream.key}"
        @get(index: @stream.key, type: "segment", id: id, fields: fields)
            .then((result) => result._source ) \
            .catch (error) =>
                debug "GET Error for #{@stream.key}/#{id}: #{error}"

    #----------

    getSegments: (options) ->
        first = moment().subtract(@hours, 'hours').valueOf()
        last = moment().valueOf()
        from = @parseId options.from, first
        to = @parseId options.to, last
        debug "Searching #{from} -> #{to} from #{@stream.key}"
        @search(index: @stream.key, type: "segment", body: {
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
            debug "SEARCH Error for #{@stream.key}: #{error}"

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
