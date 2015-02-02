nconf = require "nconf"

Archiver = require "./archiver"

# get config from environment or command line
nconf.env().argv()

# add in config file
if conf_file = nconf.get("config") || nconf.get("CONFIG")
    nconf.file( { file:conf_file } )

# -- Run -- #

a = new Archiver nconf.get()
