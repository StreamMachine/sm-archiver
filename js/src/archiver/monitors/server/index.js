var Monitor, ServerMonitor, debug, graphite, time,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Monitor = require("../monitor");

graphite = require("../graphite");

time = require("../../utils/time");

debug = require("debug")("sm:archiver:monitors:server");

ServerMonitor = (function(superClass) {
  extend(ServerMonitor, superClass);

  function ServerMonitor(options) {
    ServerMonitor.__super__.constructor.call(this, options);
    this.connections = 0;
    this.requests = 0;
    this.server._server.on("connection", this.onConnection.bind(this));
    this.server._server.on("request", this.onRequest.bind(this));
  }

  ServerMonitor.prototype.onConnection = function(socket) {
    this.connections++;
    this.graphite.increment(["server", "connections", "opened"]);
    this.graphite.gauge(["server", "connections", "concurrent"], this.connections);
    socket.on("error", this.onConnectionError.bind(this));
    return socket.on("close", this.onConnectionClose.bind(this));
  };

  ServerMonitor.prototype.onConnectionError = function(error) {
    this.graphite.increment(["server", "connections", "errors"]);
    return debug(error);
  };

  ServerMonitor.prototype.onConnectionClose = function() {
    this.connections--;
    this.graphite.increment(["server", "connections", "closed"]);
    return this.graphite.gauge(["server", "connections", "concurrent"], this.connections);
  };

  ServerMonitor.prototype.onRequest = function(req, res) {
    this.requests++;
    this.graphite.increment(["server", "requests", "opened"]);
    this.graphite.gauge(["server", "requests", "concurrent"], this.requests);
    req.on("error", this.onRequestError.bind(this, req));
    return res.on("finish", this.onResponseFinish.bind(this, req, res));
  };

  ServerMonitor.prototype.onRequestError = function(req, event) {
    return this.graphite.increment(["server", "requests", "error", event.type || "uncaught", req.method]);
  };

  ServerMonitor.prototype.onResponseFinish = function(req, res) {
    this.requests--;
    this.graphite.increment(["server", "requests", "closed"]);
    this.graphite.gauge(["server", "requests", "concurrent"], this.requests);
    return this.hit(req, res);
  };

  ServerMonitor.prototype.hit = function(req, res) {
    var diff, hasTime, metric, size;
    hasTime = req.startTime && res.startTime;
    diff = hasTime ? time.tupleDiff(req.startTime, res.startTime) : 0;
    size = res.get("Content-Length") || 0;
    metric = ["server", "requests", "hits", req.method, res.statusCode || 0];
    if (hasTime) {
      this.graphite.timing(metric, time.tupleToMilliseconds(diff).toFixed());
    }
    return this.graphite.timing(metric.concat("size"), size);
  };

  return ServerMonitor;

})(Monitor);

module.exports = ServerMonitor;

//# sourceMappingURL=index.js.map
