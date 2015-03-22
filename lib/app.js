// app.js
//
// node.js app to asynchronously stream USGS water data

var http = require('http');
var url = require('url');
var zlib = require('zlib');
var usgs = require('./usgs.js');

function readRequest(request) {
    var requestUrl = url.parse(request.url, true);
    var site = requestUrl.pathname.slice(1);
    var query = requestUrl.query;
    var period = query['period'] || 'P7D';  // default: 7 days
    var startDT = query['startDT'] || null;
    var endDT = query['endDT'] || null;

    return {'site': site, 'period': period, 'startDT': startDT, 'endDT': endDT};
}

var server = http.createServer(function(request, response) {

    var options = readRequest(request);
    //console.log('site, period: ' + options.site + ', ' + options.period);

    if (! /^\d{8}$/.test(options.site)) {
        response.writeHead(400, {"Content-Type": "text/plain"});
        var body = 'USGS site (' + options.site + ') not recognized\n';
        response.end(body);
        return;
    }

    response.writeHead(200, {"Content-Type": "text/plain"});

    var query = usgs.query(options);
    usgs.server.headers['Content-Length'] = query.length;

    var weatherdata = http.request(usgs.server, function(nwis) {
        //console.log('status: ' + nwis.statusCode);
        //console.log('headers: ' + JSON.stringify(nwis.headers));

        if (nwis.headers['content-encoding'] == 'gzip')
            nwis = nwis.pipe(zlib.createGunzip());
        else if (nwis.headers['content-encoding'] == 'deflate')
            nwis = nwis.pipe(zlib.createInflate());

        usgs.transform(nwis, response);
    }).on('error', function(e) {
        console.log('weatherdata error: ' + e.message);
    });

    weatherdata.write(query);
    weatherdata.end();

}).on('error', function(e) {
    console.log('server error: ' + e.message);
});

var port = process.env.PORT || 5000;
server.listen(port);
console.log('usgs-stream listening to http://127.0.0.1:' + port + '/');
