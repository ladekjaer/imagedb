const fs = require('fs');
const crypto = require('crypto');
const hash_algorithm = 'sha256';
const { spawn } = require('child_process');
const database = require('./database');

let fileCount = 0;
let hashingRunning = 0;
const maxHashingRunning = 4;
const filesToHash = [];

let verbose;
let super_verbose;

exports.initialize = function(databaseName, isVerbose, isSuper_verbose1) {
    verbose = isVerbose;
    super_verbose = isSuper_verbose1;
    database.initialize_db(databaseName);
};

exports.loopFiles = loopFiles;

function loopFiles(directory) {
    fs.readdir(directory, function(err, files) {
        if (err && err.code === 'ENOENT') {
            return
        } else if (err) {
            throw err
        }
        files.forEach(function(file) {
            const filepath = directory + '/' + file;
            fileStat(filepath)
        })
    })
}

function fileStat(filepath) {
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
        loopFiles(filepath)
    } else {
        filesToHash.push({filepath: filepath, stats: stats});
        if (hashingRunning++ < maxHashingRunning) {
            computeHash(hash_algorithm, function(err) {
                if (err) {
                    console.err(err);
                    throw err;
                }
                hashingRunning--
            })
        }
    }
}

function computeHash(algorithm, callback) {
    let done = false;
    const file = filesToHash.shift();
    if (!file) {
        return callback(null)
    }

    let hash = crypto.createHash(algorithm);
    let rs;
    rs = fs.createReadStream(file.filepath);
    const exiftool = spawn('exiftool', ['-json', '-']);
    let exif = '';
    let exif_error = '';
    let exif_info = {};

    exiftool.stdout.on('data', function(chunk) {
        exif += chunk
    });

    exiftool.stderr.on('data', function(chunk) {
        exif_error += chunk
    });

    exiftool.stdin.on('error', function(e){ console.log("rs.pipe has error:" + e.message) });

    exiftool.on('close', function(code) {
        if (code) console.log('The exit code for %s is %s', file.filepath, code);
        exif_info = extractExif(exif);
        if (done) {
            nextFile(file.filepath, hash, file.stats.size, exif_info, algorithm, callback)
        } else {
            done = true
        }
    });

    rs.on('open', function() {});

    rs.on('error', function(err) {
        console.log('Read stream error');
        throw err
    });

    rs.on('data', function(chunk) {
        hash.update(chunk);
        exiftool.stdin.write(chunk)
    });

    rs.on('end', function() {
        hash = hash.digest('hex');
        exiftool.stdin.end();

        if (done) {
            nextFile(file.filepath, hash, file.stats.size, exif_info, algorithm, callback)
        } else {
            done = true
        }
    })
}

function nextFile(filepath, hash, size, exif_info, algorithm, callback) {
    database.insertStat(filepath, hash, size, exif_info, function(err, rowInserted) {
        if (err) {
            console.error('database error');
            throw err
        }
        if (verbose) console.log('%s: %s', ++fileCount, filepath);
        if (super_verbose) console.log(rowInserted);
    });
    computeHash(algorithm, callback)
}

function extractExif(exif) {
    return JSON.parse(exif)[0]
}