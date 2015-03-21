// usgs.js
//
// Methods to read [USGS water data][1].
//
// [1]: http://help.waterdata.usgs.gov/faq/automated-retrievals

var moment = require('moment');
var querystring = require('querystring');
var zlib = require('zlib');
var Rdb = require('./rdb.js');
var version = require('../package.json').version;

// see: http://help.waterdata.usgs.gov/faq/automated-retrievals
var server = {
    hostname: 'nwis.waterservices.usgs.gov',
    port: 80,
    path: '/nwis/iv/',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection': 'keep-alive',
        'User-Agent': 'usgs-stream/' + version,
        'Accept-Encoding': 'gzip,deflate',  // be nice
        'Content-Length': 0
    }
};

function query(options) {
    var param = {'format': 'rdb'};

    for (var k in options) {
        if (options[k])
            param[k] = options[k];
    }

    // date range has precedence over time period
    if (param['startDT'])
        delete param['period'];

    //console.log(param);
    return querystring.stringify(param);
}

function transform(nwis, app) {
    var rdb = Rdb();

    switch (nwis.headers['content-encoding']) {
    case 'gzip':
        var z = zlib.createGunzip();
        nwis.pipe(z).pipe(rdb);
        break;
    case 'deflate':
        var z = zlib.createInflate();
        nwis.pipe(z).pipe(rdb);
        break;
    default:
        nwis.pipe(rdb);
        break;
    }

    var fields;
    var body;

    rdb.on('readable', function() {
        var header = rdb.readHeader();
        if (header) {
            fields = Object.keys(header.fields);
            body = '{"header":' + JSON.stringify(header) + ',"data": [';
            app.write(body);
        }

        var line;
        while (line = rdb.read()) {
            var x = line.split('\t');

            var data = {};
            for (var i = 0; i < fields.length; i++)
                data[fields[i]] = x[i];

            data['utc'] = moment(data['datetime']).utcOffset(data['tz_cd']).utc();

            if (header)
                body = JSON.stringify(data);  // first row is special
            else
                body = ',' + JSON.stringify(data);

            app.write(body);
        }
    });

    rdb.on('end', function() {
        body = ']}\n';
        app.end(body);
    });
}

exports.server = server;
exports.query = query;
exports.transform = transform;
