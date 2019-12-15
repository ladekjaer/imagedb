# imagedb
Script to create a sqlite database of image files.

The Idea is, that imagedb should be used to to three things

  1. Image statistics
  2. Finding duplicates
  3. Testing data integrity
  
 Using a standard sqlite3 database makes it easy for users who know SQL to run their own commands to extract data and create custom tables, views et c.

## Installation and usage

### Installation
One-line install

```
npm install imagedb -g
```

### Usage
To create a sqlite database of the images in the directory `my_photo_dir` and save it in `my_db.db` run the command
```
imagedb my_photo_dir my_db.db
```

If the command is run against an existing database, metadata from `my_photo_dir` will be added to it.

To check which version is install simply run `imagedb -v` or `imagedb --version`.

## Todo

- Adding hash of the image part of the files (to help finding duplicates).
  - Require hashes of the image parts to be unique
- Finding some kind of unique Id for each image file (to make data integrity testing easier).
- Avoid adding the same file more than once.
- Use schema (to make it clearer for users how to handle the database file).
- Possibility to compare two databases.
