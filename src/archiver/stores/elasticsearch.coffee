P = require "bluebird"
_ = require "underscore"
elasticsearch = require "elasticsearch"
debug = require("debug") "sm:archiver:stores:elasticsearch"

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
        if not options.from and not options.to
            options.from = "now-#{@hours}h"
        else if options.from and not options.to
            options.to = options.from
            if not options.to.startsWith("now")
                 options.to += "||"
            options.to += "+#{@hours}h"
        else if options.to and not options.from
            options.from = options.to
            if not options.from.startsWith("now")
                options.from += "||"
            options.from += "-#{@hours}h"
        debug "Searching #{options.from} -> #{options.to} from #{@stream.key}"
        @search(index: @stream.key, type: "segment", body: {
            size: @options.size,
            sort: "id",
            query: {
                range: {
                    ts: {
                        gte: options.from,
                        lt: options.to
                    }
                }
            }
        }) \
        .then((result) => P.map(result.hits.hits, (hit) => hit._source)) \
        .catch (error) =>
            debug "SEARCH Error for #{@stream.key}: #{error}"

    #----------

#----------

module.exports = ElasticsearchStore
