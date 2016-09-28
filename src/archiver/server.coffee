cors = require "cors"
moment = require "moment"
express = require "express"
onHeaders = require "on-headers"
bodyParser = require "body-parser"
compression = require "compression"
ClipExporter = require "./clip_exporter"
debug = require("debug") "sm:archiver:server"

class Server
    constructor: (@core, @options, @log) ->
        @app = express()
        @app.set "x-powered-by", "StreamMachine Archiver"
        @app.use cors(exposedHeaders: ["X-Archiver-Preview-Length", "X-Archiver-Filename"])
        @app.options "*", cors()

        @app.use (req, res, next) =>
            req.startTime = process.hrtime()
            onHeaders res, ->
                @startTime = process.hrtime()
            next()

        @app.use (req, res, next) =>
            res.header("Access-Control-Allow-Origin", "*")
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
            next()

        @app.param "stream", (req, res, next, key) =>
            if key? && s = @core.streams[key]
                req.stream = s
                next()
            else
                res.status(404).end "Invalid stream.\n"

        @app.get "/:stream.m3u8", compression(filter: -> true), (req, res) =>
            if @options.outputs?.live?.enabled and not req.query.from and not req.query.to
                return new @core.Outputs.live_streaming.Index req.stream, req: req, res: res
            if not @options.outputs?.hls?.enabled or not req.stream.archiver
                return res.status(404).json status: 404, error: "Stream not archived"
            req.stream.archiver.getHls req.query, (error, hls) =>
                if error
                    res.status(500).json status: 500, error: error
                else if not hls or not hls.length
                    res.status(404).json status: 404, error: "Hls not found"
                else
                    hlsString = hls.toString()
                    res.set "Content-Type", "application/vnd.apple.mpegurl"
                    res.set "Content-Length", hlsString.length
                    res.set "X-Archiver-Hls-Length", hls.length
                    res.send new Buffer hlsString

        @app.get "/:stream/ts/:segment.(:format)", (req, res) =>
            if not req.stream.archiver
                return res.status(404).json status: 404, error: "Stream not archived"
            req.stream.archiver.getAudio req.params.segment, req.params.format, (error, audio) =>
                if error
                    res.status(500).json status: 500, error: error
                else if not audio
                    res.status(404).json status: 404, error: "Audio not found"
                else
                    res.type req.params.format
                    res.send audio

        @app.get "/:stream/info", (req, res) =>
            res.json format: req.stream.opts.format, codec: req.stream.opts.codec, archived: req.stream.archiver?

        @app.get "/:stream/preview", (req, res) =>
            if not req.stream.archiver
                return res.status(404).json status: 404, error: "Stream not archived"
            req.stream.archiver.getPreview req.query, (error, preview) =>
                if error
                    res.status(500).json status: 500, error: error
                else if not preview
                    res.status(404).json status: 404, error: "Preview not found"
                else
                    res.set "X-Archiver-Preview-Length", preview.length
                    res.json preview


        @app.get "/:stream/segments/:segment", (req, res) =>
            if not req.stream.archiver
                return res.status(404).json status: 404, error: "Stream not archived"
            req.stream.archiver.getSegment req.params.segment, (error, segment) =>
                if error
                    res.status(500).json status: 500, error: error
                else if not segment
                    res.status(404).json status: 404, error: "Segment not found"
                else
                    res.json segment

        @app.get "/:stream/waveform/:segment", (req, res) =>
            if not req.stream.archiver
                return res.status(404).json status: 404, error: "Stream not archived"
            req.stream.archiver.getWaveform req.params.segment, (error, waveform) =>
                if error
                    res.status(500).json status: 500, error: error
                else if not waveform
                    res.status(404).json status: 404, error: "Waveform not found"
                else
                    res.json waveform

        @app.post "/:stream/comments", bodyParser.json(), (req, res) =>
            if not req.stream.archiver
                return res.status(404).json status: 404, error: "Stream not archived"
            req.stream.archiver.saveComment req.body, (error, comment) =>
                if error
                    res.status(500).json status: 500, error: error
                else
                    res.json comment

        @app.get "/:stream/comments", (req, res) =>
            if not req.stream.archiver
                return res.status(404).json status: 404, error: "Stream not archived"
            req.stream.archiver.getComments req.query, (error, comments) =>
                if error
                    res.status(500).json status: 500, error: error
                else if not comments
                    res.status(404).json status: 404, error: "Comments not found"
                else
                    res.set "X-Archiver-Comments-Length", comments.length
                    res.json comments

        @app.get "/:stream/comments/:comment", (req, res) =>
            if not req.stream.archiver
                return res.status(404).json status: 404, error: "Stream not archived"
            req.stream.archiver.getComment req.params.comment, (error, comment) =>
                if error
                    res.status(500).json status: 500, error: error
                else if not comment
                    res.status(404).json status: 404, error: "Comment not found"
                else
                    res.json comment

        @app.get "/:stream/export", (req,res) =>
            new ClipExporter req.stream, req:req, res:res
            #new @core.Outputs.pumper req.stream, req:req, res:res

        @_server = @app.listen @options.port,() =>
            debug "Listing on port #{@options.port}"

        debug "Created"

    #----------

#----------

module.exports = Server
