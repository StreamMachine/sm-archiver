var Archiver, a, conf_file, nconf;

nconf = require("nconf");

Archiver = require("./archiver");

nconf.env().argv();

if (conf_file = nconf.get("config") || nconf.get("CONFIG")) {
  nconf.file({
    file: conf_file
  });
}

a = new Archiver(nconf.get());

//# sourceMappingURL=runner.js.map
