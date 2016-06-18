P = require "bluebird"
AWS = require "aws-sdk"
_ = require "underscore"

debug = require("debug")("sm:archiver:stores:s3")

module.exports = class S3Store
    constructor:(@stream,@options) ->
        _.extend(@, new AWS.S3 @options)
        P.promisifyAll @
        @prefix = "sm-archiver/#{@stream.key}"
        @format = @stream.opts.format
        debug "Created"


    getSegmentById:(id) ->
        @getFile("#{@prefix}/index/segments/#{id}") \
            .then (data) =>
                @getSegment(data.Body)

    getSegment:(key) ->
        @getFile("#{@prefix}/#{key}.json") \
            .then (data) =>
                JSON.parse(data.Body)

    getFile:(key) ->
        @getObjectAsync(Key:key) \
            .catch (error) =>
                debug "GET Error for #{key}: #{error}"
                throw error

    putFileIfNotExists: (key,body,options) ->
        return @headObjectAsync(Key:key) \
            .catch (error) =>
                if error.statusCode == 404
                    debug "Storing #{key}"
                    return @putObjectAsync(_.extend({}, options || {}, Key:key,Body:body)) \
                        .catch (error) ->
                            debug "PUT Error for #{key}: #{error}"
                debug "HEAD Error for #{key}: #{error}"

#----------
