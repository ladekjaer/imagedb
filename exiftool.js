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
            fs.stat(filepath, function(err, stats) {
                if (stats.isDirectory()) {
                    loopFiles(filepath)
                } else {
                    filesToHash.push({filepath: filepath, stats: stats});
                    if (hashingRunning++ < maxHashingRunning) {
                        computeHash(hash_algorithm, function (err) {
                            if (err) {
                                console.log(err);
                                throw err;
                            }
                            hashingRunning--
                        })
                    }
                }
            })
        })
    })
}

function computeHash(algorithm, callback) {
    let running = 3;
    const file = filesToHash.shift();
    if (!file) {
        return callback(null)
    }

    let hash = crypto.createHash(algorithm);
    let image_hash = crypto.createHash(algorithm);
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

    exiftool.stdin.on('error', function(e){
        console.error("EXIFTOOL: rs.pipe has error:" + e.message)
    });

    exiftool.on('close', function(code) {
        if (verbose && code) console.error('Unable to extract image metadata from %s (exiftool error code: %s)', file.filepath, code);
        exif_info = extractExif(exif);
        if (--running === 0) {
            nextFile(file.filepath, hash, image_hash, file.stats.size, exif_info, algorithm, callback)
        }
    });

    const image_process = spawn('exiftool', ['-m', '-all=', '-']);

    image_process.stdout.on('data', function (chunk) {
        image_hash.update(chunk)
    });

    image_process.stderr.on('data', function(chunk) {
        if (verbose) {
            console.error('Error (%s) extracting image from file %s.', chunk.toString(), file.filepath)
        }
    });

    image_process.stdin.on('error', function(err) {
        console.error("ERROR process extracting image from file %s. Error message: %s", file.filepath, err.message);
    });

    image_process.on('close', function (code) {
        if (code) {
            image_hash = null;
            if (verbose) {
                console.error('Unable to extract image data from %s (exiftool error code: %s)', file.filepath, code);
            }
        } else {
            image_hash = image_hash.digest('hex');
        }
        if (--running === 0) {
            nextFile(file.filepath, hash, image_hash, file.stats.size, exif_info, algorithm, callback)
        }
    });

    rs.on('open', function() {});

    rs.on('error', function(err) {
        console.error('RS: Read stream error');
        throw err
    });

    rs.on('data', function(chunk) {
        hash.update(chunk);
        exiftool.stdin.write(chunk);
        image_process.stdin.write(chunk)
    });

    rs.on('end', function() {
        hash = hash.digest('hex');
        exiftool.stdin.end();
        image_process.stdin.end();

        if (--running === 0) {
            nextFile(file.filepath, hash, image_hash, file.stats.size, exif_info, algorithm, callback)
        }
    })
}

function nextFile(filepath, file_hash, image_hash, size, exif_info, algorithm, callback) {
    let file_info = {
        file_path: filepath,
        file_hash: file_hash,
        image_hash: image_hash,
        file_size: size
    };
    database.insertStat(file_info, exif_info, function(err, rowInserted) {
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