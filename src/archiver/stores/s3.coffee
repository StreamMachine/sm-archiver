P = require "bluebird"
AWS = require "aws-sdk"
_ = require "underscore"
moment = require "moment"
debug = require("debug") "sm:archiver:stores:s3"

class S3Store
    constructor: (@stream, @options) ->
        _.extend(@, new AWS.S3 @options)
        P.promisifyAll @
        @prefix = "sm-archiver/#{@stream.key}"
        @format = @stream.opts.format
        debug "Created for #{@stream.key}"

    #----------

    getAudioById: (id, format) ->
        return P.resolve() if format != @format
        @getFile("audio/#{id}.#{format}") \
            .then (data) => data.Body

    #----------

    getFile: (key) ->
        key = "#{@prefix}/#{key}"
        debug "Getting #{key}"
        @getObjectAsync(Key: key) \
            .catch (error) =>
                debug "GET Error for #{key}: #{error}"
                throw error

    #----------

    putFileIfNotExists: (key, body, options) ->
        key = "#{@prefix}/#{key}"
        return @headObjectAsync(Key: key) \
            .then(() => debug "Skipping #{key}")
            .catch (error) =>
                if error.statusCode == 404
                    debug "Storing #{key}"
                    return @putObjectAsync(_.extend({}, options || {}, Key: key, Body: body)) \
                        .catch (error) ->
                            debug "PUT Error for #{key}: #{error}"
                debug "HEAD Error for #{key}: #{error}"

    #----------

#----------

module.exports = S3Store
