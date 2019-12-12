const p = require('path');
const exiftool = require('./exiftool');

let path = process.argv[2] || './photos';
path = p.resolve(path);

let database = process.argv[3] || './images.db'

const verbose = true;
const super_verbose = false;

if (verbose) {
    console.log('path: %s', path)
    console.log('database: %s', database)
}

exiftool.initialize(database, verbose, super_verbose);
exiftool.loopFiles(path);