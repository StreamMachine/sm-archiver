# Streammachine Archiver

This is an experiment that may eventually become part of
[StreamMachine](https://github.com/StreamMachine/StreamMachine)'s core functionality.

Archiver connects to StreamMachine master as a slave, but instead of serving
data up to clients it writes HLS segments to disk or S3.

## Requirements

* StreamMachine ~> 0.7
* Node.js

## Running

This code doesn't do a lot yet, but you can fire it up with something along the lines of:

    coffee ./src/runner.coffee --config dev.json

Waveform data is kept in memory and is regenerated on restart.
