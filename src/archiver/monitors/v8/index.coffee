V8 = require "./v8"
_ = require "underscore"
Monitor = require "../monitor"
time = require "../../utils/time"

class V8Monitor extends Monitor
    constructor: (options) ->
        super(options)
        @v8 = new V8()
        @v8.on "gc:*", (data) =>
            @onGC(data)

    onGC: (data) ->
        @graphite.timing ["gc", data.type], time.tupleToNanoseconds(data.duration)
        @graphite.timing ["gc", data.type, "allocated"], data.allocated
        @graphite.timing ["gc", data.type, "released"], data.released

    check: ->
        memory = process.memoryUsage()
        heap = @v8.getHeapStatistics()
        hrtime = process.hrtime()

        setImmediate () =>
            diff = process.hrtime hrtime
            @graphite.timing ["eventloop", "latency"], time.tupleToNanoseconds(diff)

        @graphite.timing ["memory", "rss"], memory.rss
        _.each heap, (value, key) ->
            @graphite.timing ["memory", key], heap[key]
        , @

module.exports = V8Monitor
