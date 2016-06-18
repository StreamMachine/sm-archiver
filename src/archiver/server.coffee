express = require "express"
compression = require "compression"

ClipExporter = require "./clip_exporter"

module.exports = class Server
    constructor: (@core,@port,@log) ->
        @app = express()

        @app.set "x-powered-by", "StreamMachine Archiver"

        @app.use (req, res, next) =>
            res.header("Access-Control-Allow-Origin", "*")
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
            next()

        # -- Stream Finder -- #

        @app.param "stream", (req,res,next,key) =>
            # make sure it's a valid stream key
            if key? && s = @core.streams[ key ]
                req.stream = s
                next()
            else
                res.status(404).end "Invalid stream.\n"

        @app.get "/:stream.m3u8", compression(filter:->true), (req,res) =>
            new @core.Outputs.live_streaming.Index req.stream, req:req, res:res

        @app.get "/:stream/ts/:seg.(:format)", (req,res) =>
            new @core.Outputs.live_streaming req.stream, req:req, res:res, format:req.params.format

        @app.get "/:stream/info", (req,res) =>
            res.json format:req.stream.opts.format, codec:req.stream.opts.codec, archived:req.stream.archiver?

        @app.get "/:stream/preview", (req,res) =>
            if !req.stream.archiver
                return res.status(404).json status:404,error:"Stream not archived"
            req.stream.archiver.getPreview (err,preview) =>
                if err
                    res.status(404).json status:404,error:"Preview not found"
                else
                    res.json preview

        @app.get "/:stream/waveform/:seg", (req,res) =>
            if !req.stream.archiver
                return res.status(404).json status:404,error:"Stream not archived"
            req.stream.archiver.getWaveform req.params.seg, (err,waveform) =>
                if err
                    res.status(404).json status:404,error:"Waveform not found"
                else
                    res.json waveform

        @app.get "/:stream/export", (req,res) =>
            new ClipExporter req.stream, req:req, res:res
            #new @core.Outputs.pumper req.stream, req:req, res:res

        # -- Listen! -- #

        @_server = @app.listen @port
