// index.js

var usgs = require('./usgs.js');
var rdb = require('./rdb.js');

exports.query = usgs.query;
exports.server = usgs.server;
exports.transform = usgs.transform;
exports.Rdb = rdb.Rdb;
