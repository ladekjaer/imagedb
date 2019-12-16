const sqlite3 = require('sqlite3').verbose();
let db;

const exiftool_json_to_db = {
    // Camera settings
    ExposureTime: {dbFieldName: 'exposure_time', dbType: 'text'},
    ExposureProgram: {dbFieldName: 'exposure_program', dbType: 'text'},
    ShutterSpeed: {dbFieldName: 'shutter_speed', dbType: 'text'},
    FNumber: {dbFieldName: 'f_number', dbType: 'float'},
    Aperture: {dbFieldName: 'aperture', dbType: 'float'},
    ISO: {dbFieldName: 'iso', dbType: 'text'},
    Flash: {dbFieldName: 'flash', dbType: 'text'},
    FocalLength: {dbFieldName: 'focal_length', dbType: 'float'},
    WhiteBalance: {dbFieldName: 'white_balance', dbType: 'text'},
    FocusMode: {dbFieldName: 'focus_mode', dbType: 'text'},
    Orientation: {dbFieldName: 'orientation', dbType: 'text'},

    // Camera
    Make: {dbFieldName: 'make', dbType: 'text'},
    Model: {dbFieldName: 'camera_model_name', dbType: 'text'},
    SerialNumber: {dbFieldName: 'serial_number', dbType: 'integer'},
    InternalSerialNumber: {dbFieldName: 'internal_serial_number', dbType: 'text'}, // Used by Panasonic

    // Time and date
    DateTimeOriginal: {dbFieldName: 'date_time_original', dbType: 'text'},
    TimeZone: {dbFieldName: 'time_zone', dbType: 'text'},
    DaylightSavings: {dbFieldName: 'daylight_savings', dbType: 'text'},

    // GPS
    GPSAltitude: {dbFieldName: 'gps_altitude', dbType: 'text'},
    GPSDateTime: {dbFieldName: 'gps_date_time', dbType: 'text'},
    GPSLatitude: {dbFieldName: 'gps_latitude', dbType: 'text'},
    GPSLongitude: {dbFieldName: 'gps_longitude', dbType: 'text'},
    GPSPosition: {dbFieldName: 'gps_position', dbType: 'text'},

    // Lens
    Lens: {dbFieldName: 'lens', dbType: 'text'},
    LensID: {dbFieldName: 'lens_id', dbType: 'text'},
    LensSpec: {dbFieldName: 'lens_spec', dbType: 'text'},

    // The specific Image
    ShutterCount: {dbFieldName: 'shutter_count', dbType: 'integer'}, // Used by Nikon
    ImageUniqueID: {dbFieldName: 'image_unique_id', dbType: 'text'}, // Used by Canon
    FileNumber: {dbFieldName: 'file_number', dbType: 'text'}, // Used by Nikon
    DOF: {dbFieldName: 'dof', dbType: 'text'},
    FOV: {dbFieldName: 'fov', dbType: 'text'},
    FocalLengthIn35mmFormat: {dbFieldName: 'focal_length_35mm', dbType: 'text'},
    HyperfocalDistance: {dbFieldName: 'hyperfocal_distance', dbType: 'text'},
    CircleOfConfusion: {dbFieldName: 'circle_of_confusion', dbType: 'text'},

    // File
    FileType: {dbFieldName: 'file_type', dbType: 'text'},
    FileTypeExtension: {dbFieldName: 'file_type_extension', dbType: 'text'},
    MIMEType: {dbFieldName: 'mime_type', dbType: 'text'},

    // Custom
    Uuid: {dbFieldName: 'uuid', dbType: 'text'}
};

let sqlCreate = 'CREATE TABLE IF NOT EXISTS files (filename text, ';
let sqlInsert = 'INSERT INTO files VALUES ($filename, ';
Object.entries(exiftool_json_to_db).forEach(function(map) {
    sqlCreate += map[1].dbFieldName;
    sqlCreate += " ";
    sqlCreate += map[1].dbType;
    sqlCreate += ", ";
    sqlInsert += "$";
    sqlInsert += map[1].dbFieldName;
    sqlInsert += ", "
});
sqlCreate += 'file_path text, file_hash text, image_hash text, file_size integer)';
sqlInsert += '$file_path, $file_hash, $image_hash, $file_size)';

function insertStat(file_info, exif_info, callback) {
    let filename = file_info.file_path.split('/');
    filename = filename[filename.length - 1];

    const insertMap = {
        $filename: filename,
        $file_path: file_info.file_path,
        $file_hash: file_info.file_hash,
        $image_hash: file_info.image_hash,
        $file_size: file_info.file_size,
    };

    Object.entries(exiftool_json_to_db).forEach(function(map) {
        insertMap['$'+map[1].dbFieldName] = exif_info[map[0]]
    });

    db.run(sqlInsert, insertMap, function(err) {
        if (err) {
            return callback(err);
        }
        callback(null, insertMap)
    })
}

exports.insertStat = insertStat;

exports.initialize_db = function(database) {
    db = new sqlite3.Database(database);
    db.serialize(function() {
        db.run(sqlCreate)
    });
};
