express = require "express"
compression = require "compression"

module.exports = class Server
    constructor: (@core,@port,@log) ->
        @app = express()
        #@_server = http.createServer @app

        @app.set "x-powered-by", "StreamMachine"

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

        @app.get "/:stream/waveform/:seg", (req,res) =>
            if json = req.stream._waveforms[req.params.seg]
                res.writeHead 200,
                    "Content-type": "application/json"
                    "Content-length": json.length

                res.end json

            else
                res.status(404).end "Waveform not found."

        # -- Listen! -- #

        @_server = @app.listen @port
