_ = require "underscore"
P = require "bluebird"
Client = require "node-statsd"
debug = require("debug") "sm:archiver:monitors:graphite"

HOSTNAME = require("os").hostname()
PLACEHOLDER = "<<separator>>"
DEFAULT_INCREMENT = 1
TAGS_SEPARATOR = ","
SEPARATOR = "."
EXTREME = ""
SPACE = "_"
SLASH = "."
DOT = "+"

rSeparator = new RegExp(PLACEHOLDER, "g")
rSpace = new RegExp(" ", "g")
rDotsExt = /(^\.|\.$)/g
rSlash = /\//g
rDots = /\.+/g
rDot = /\./g

P.promisifyAll(Client.prototype)

class Graphite
    constructor: (@opts) ->
        @client = new Client @opts
        @PLACEHOLDER = PLACEHOLDER
        @SEPARATOR = SEPARATOR
        @SPACE = SPACE
        @SLASH = SLASH
        @DOT = DOT
        @EXTREME = EXTREME
        @TAGS_SEPARATOR = TAGS_SEPARATOR

    timing: (name, value, sampleRate, tags) ->
        @send "timing", name, value,
            sampleRate: sampleRate,
            tags: tags

    increment: (name, value, sampleRate, tags) ->
        @send "increment", name, value || DEFAULT_INCREMENT,
            sampleRate: sampleRate,
            tags: tags

    decrement: (name, value, sampleRate, tags) ->
        @send "decrement", name, value or DEFAULT_INCREMENT,
            sampleRate: sampleRate,
            tags: tags

    histogram: (name, value, sampleRate, tags) ->
        @send "histogram", name, value,
            sampleRate: sampleRate,
            tags: tags

    gauge: (name, value, sampleRate, tags) ->
        @send "gauge", name, value,
            sampleRate: sampleRate,
            tags: tags

    unique: (name, value, sampleRate, tags) ->
        @send "unique", name, value,
            sampleRate: sampleRate,
            tags: tags

    set: (name, value, sampleRate, tags) ->
        @unique name, value,
            sampleRate: sampleRate,
            tags: tags

    send: (method, metric, value, options) ->
        options = _.defaults options || {},
            sampleRate: 1,
            tags: []
        metric = @stringify metric
        @mock method, metric, value, options
        @client["#{method}Async"] metric, value, options.sampleRate, options.tags

    stringify: (name) ->
        string = if Array.isArray(name) then name.join(@PLACEHOLDER) else name.replace(rDot, @PLACEHOLDER)
        string = string
            .replace(rSpace, @SPACE)
            .replace(rDot, @DOT)
            .replace(rSeparator, @SEPARATOR)
            .replace(rSlash, @SLASH)
            .replace(rDots, @SEPARATOR)
            .replace(rDotsExt, @EXTREME)
        "#{HOSTNAME}#{SEPARATOR}#{string}".toLowerCase()

    mock: (method, metric, value, options) ->
        if @opts.mock
            debug("Graphite #{method} #{metric} #{value} #{options.sampleRate} #{options.tags.join(@TAGS_SEPARATOR)}")

module.exports = Graphite
