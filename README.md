# StreamMachine Archiver

This is an experiment that may eventually become part of
[StreamMachine](https://github.com/StreamMachine/StreamMachine)'s core functionality.

Archiver connects to StreamMachine master as a slave, but instead of serving
data up to clients it writes HLS segments to disk or S3.

So far, waveform data is kept in memory and is regenerated on restart.

While running, StreamMachine Archiver can be found at http://localhost:9000<sup>(1)</sup>.

## Requirements

* Node.js<sup>(2)</sup>
* libgroove<sup>(3)</sup>
* Docker<sup>(4)</sup>

## Running

### Locally

#### Installing

    npm install

#### Starting

    npm start -- --config config/dev.json

#### Debug Mode

    npm run start:debug -- --config config/dev.json

### With Docker

#### Building

    docker build -t sm-archiver .

#### Installing

    npm run docker -- npm install

#### Starting

    npm run docker:start -- -- --config config/dev.json

#### Debug Mode

    npm run docker:start:debug -- -- --config config/dev.json

## Notes

1. Unless running with Docker via *boot2docker* or *docker-machine*, in which case localhost should be replaced with the Docker VM's IP.
2. Not required if running with Docker.
3. Not required if running with Docker.
4. Not required if running locally.
