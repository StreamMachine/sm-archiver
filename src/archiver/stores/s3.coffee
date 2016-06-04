debug = require("debug")("sm:archiver:store:s3")

P = require "bluebird"
AWS = require "aws-sdk"
_ = require "underscore"
moment = require "moment"

module.exports = class S3ArchiverStore
    constructor: (@stream,@options) ->
        @prefix = "sm-archiver/#{@stream.key}"
        @s3 = new S3ArchiverStore.S3 @options
        @stream.on "hls_snapshot", (snapshot) =>
            debug "HLS Snapshot for #{@stream.key} (#{snapshot.segments.length} segments of #{snapshot.segment_duration} seconds)"
            @generateIndex(snapshot) \
                .then(@storeFullIndex) \
                .catch((error) => debug error)

    #----------

    generateIndex: (snapshot) =>
        debug "Creating index for #{@stream.key}"
        return P.reduce snapshot.segments,@indexSegment,{}

    #----------

    indexSegment: (index,segment) =>
        ts = moment(segment.ts)

        year = String(ts.year())
        month = String(ts.month() + 1)
        date = String(ts.date())
        hour = String(ts.hour())
        minute = String(ts.minute())
        second = String(ts.second())

        index[year] = index[year] || {}
        index[year][month] = index[year][month] || {}
        index[year][month][date] = index[year][month][date] || {}
        index[year][month][date][hour] = index[year][month][date][hour] || {}
        index[year][month][date][hour][minute] = index[year][month][date][hour][minute] || {}
        index[year][month][date][hour][minute][second] = segment
        return index

    #----------

    storeFullIndex: (index) =>
        debug "Storing index for #{@stream.key}"
        return @storeIndex @prefix,index

    #----------

    storeIndex: (prefix,index) =>
        return P.each(Object.keys(index),(key) => \
            return @storeIndexSection(prefix,key,index))

    #----------

    storeIndexSection: (prefix,key,index) =>
        prefix = "#{prefix}/#{key}"
        section = index[key]
        if section.id
            return @storeSegment prefix,index[key]

        debug "Storing #{prefix}/index.json"
        return @s3.putObjectAsync(Key:"#{prefix}/index.json",Body:JSON.stringify(@generateSection(section))) \
            .then(@storeIndex(prefix,index[key]))

    #----------

    generateSection: (section) =>
        return _.mapObject section,(subSection) =>
            if subSection.id
                return subSection.id
            return @generateSection(subSection)

    #----------

    storeSegment: (prefix,segment) =>
        debug "Storing #{prefix}.json"
        prefix = "#{prefix}.json"
        return @s3.headObjectAsync(Key:prefix) \
            .catch (error) =>
                if error.statusCode == 404
                    return @s3.putObjectAsync(Key:prefix,Body:JSON.stringify(segment))
                return P.resolve()

    #----------

    class @S3
        constructor:(@options) ->
            _.extend(@, new AWS.S3 @options)
            P.promisifyAll @

        #----------

    #----------

#----------
