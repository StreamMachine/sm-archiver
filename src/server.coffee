express = require "express"
compression = require "compression"

module.exports = class Server
    constructor: (@core,@port,@log) ->
        @app = express()
        #@_server = http.createServer @app

        @app.set "x-powered-by", "StreamMachine"

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
            new @core.Outputs.live_streaming req.stream, req:req, res:res, format:req.param("format")

        @app.get "/:stream/preview", (req,res) =>
            req.stream._archiver.getPreview (err,preview,json) =>
                if err
                    res.status(500).end "No preview available"
                else
                    res.writeHead 200,
                        "Content-type": "application/json"
                        "Content-length": json.length

                    res.end json

        @app.get "/:stream/waveform/:seg", (req,res) =>
            req.stream._archiver.getWaveform req.params.seg, (err,json) =>
                if err
                    res.status(404).end "Waveform not found."
                    return false

                res.writeHead 200,
                    "Content-type": "application/json"
                    "Content-length": json.length

                res.end json                

        @app.get "/:stream/export", (req,res) =>
            new @core.Outputs.pumper req.stream, req:req, res:res

        # -- Listen! -- #

        @_server = @app.listen @port
