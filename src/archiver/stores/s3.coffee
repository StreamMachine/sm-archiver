P = require "bluebird"
AWS = require "aws-sdk"
_ = require "underscore"
moment = require "moment"

debug = require("debug")("sm:archiver:stores:s3")

module.exports = class S3Store
    constructor:(@stream,@options) ->
        _.extend(@, new AWS.S3 @options)
        P.promisifyAll @
        @prefix = "sm-archiver/#{@stream.key}"
        @format = @stream.opts.format
        debug "Created"

    #----------

    getSegmentById:(id) ->
        @getFile("index/segments/#{id}") \
            .then (data) =>
                @getSegment(data.Body)

    #----------

    getSegment:(key) ->
        @getFile("json/#{key}.json") \
            .then (data) =>
                JSON.parse(data.Body)

    #----------

    getSegments:(options) ->
        options = _.clone(options or {})
        options.type = options.type or "json"
        return P.resolve([]) if not options.from or not options.to
        @getFiles("#{options.type}/#{@getCommonKey(options)}")

    #----------

    getAudioBySegmentId:(id,format) ->
        @getFile("index/segments/#{id}") \
            .then (data) =>
                @getAudio(data.Body,format)

    #----------

    getAudio:(key,format) ->
        @getFile("audio/#{key}.#{format}") \
            .then (data) => data.Body
    
    #----------

    getFile:(key) ->
        key = "#{@prefix}/#{key}"
        debug "Getting #{key}"
        @getObjectAsync(Key:key) \
            .catch (error) =>
                debug "GET Error for #{key}: #{error}"
                throw error

    #----------

    getFiles:(key) ->
        key = "#{@prefix}/#{key}"
        debug "Listing #{key}"
        @listObjectsV2Async(Prefix:"#{key}") \
            .catch (error) =>
                debug "LIST Error for #{key}: #{error}"
                throw error
            .then((data) => return data.Contents)
            .map((file) => return @getObjectAsync(Key:file.Key))
            .map((file) => return JSON.parse(file.Body))
            .catch (error) =>
                debug "GET Error for #{key}: #{error}"
                throw error

    #----------

    putFileIfNotExists: (key,body,options) ->
        key = "#{@prefix}/#{key}"
        return @headObjectAsync(Key:key) \
            .catch (error) =>
                if error.statusCode == 404
                    debug "Storing #{key}"
                    return @putObjectAsync(_.extend({}, options || {}, Key:key,Body:body)) \
                        .catch (error) ->
                            debug "PUT Error for #{key}: #{error}"
                debug "HEAD Error for #{key}: #{error}"

    #----------

    getKey:(segment) ->
        year = String(segment.moment.year())
        month = String(segment.moment.month() + 1)
        date = String(segment.moment.date())
        hour = String(segment.moment.hour())
        minute = String(segment.moment.minute())
        second = String(segment.moment.second())
        return "#{year}/#{month}/#{date}/#{hour}/#{minute}/#{second}"

    #----------

    getCommonKey:(options) ->
        key = ""
        year = options.from.year()
        month = options.from.month() + 1
        date = options.from.date()
        hour = options.from.hour()
        minute = options.from.minute()
        return key if year != options.to.year()
        key += "#{year}/"
        return key if month != (options.to.month() + 1)
        key += "#{month}/"
        return key if date != options.to.date()
        key += "#{date}/"
        return key if hour != options.to.hour()
        key += "#{hour}/"
        return key if minute != options.to.minute()
        key += "#{minute}/"

    #----------

#----------
