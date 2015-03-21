// rdb.js
//
// Class to transform [USGS tab-delimited RDB data][2].
//
// [2]: http://help.waterdata.usgs.gov/faq/about-tab-delimited-output

var util = require('util');
var Transform = require('stream').Transform;

util.inherits(Rdb, Transform);

function Rdb(options) {
    if (!(this instanceof Rdb))
        return new Rdb(options);

    Transform.call(this, options);
    this._match = false;
    this._header = null
    this._lastData = null;
}

Rdb.prototype.readHeader = function () {
    // only process the header once (consume this._header)
    if (!this._header)
        return null;

    var raw = this._header;
    var data = raw.split('\n');

    // field definitions (always present)
    // see: http://help.waterdata.usgs.gov/faq/about-tab-delimited-output
    var knownFields = {
        agency_cd: 'Agency collecting data or maintaining the site',
        site_no: 'USGS site-identification number',
        datetime: 'Date (and time for real-time data) in ISO format',
        tz_cd: 'Local time zone'};

    // data type character codes
    var types = {d: 'date', m: 'month', n: 'numeric', s: 'string'};

    var keys = data[data.length - 2].split('\t');
    var title = /contained in this file\n#\s+(.*)$/m.exec(raw)[1];
    var retrieved = /^# retrieved:\s+(.*)$/m.exec(raw)[1];
    var formats = data[data.length - 1].split('\t');
    var match;

    var fields = {};
    for (var i = 0; i < keys.length; i++) {
        var sensor;
        var key;
        var desc;

        if (sensor = /^(\d+)_(\d+).*$/.exec(keys[i])) {
            var re = new RegExp('^#\\s+'+sensor[1]+'\\s+'+sensor[2]+'\\s+(.*)$', 'm');
            match = re.exec(raw);
            key = sensor[0];
            desc = match[1];
            if (keys[i].slice(-2) === 'cd') {
                desc += ' data-value qualification code';
            }
        } else {
            key = keys[i];
            desc = knownFields[key];
        }

        var t = formats[i].slice(-1);  // 10s -> s
        fields[key] = {desc: desc, type: types[t]};
    }

    var codes = {};
    var lines = /qualification codes included in this output:\s*\n([\s\S]*)\n#\s*$/m.exec(raw)[1].split('\n');
    for (var i = 0; i < lines.length; i++) {
        match = /#\s+(\w+)\s+(.*)/.exec(lines[i]);
        codes[match[1]] = match[2].trim()
    }

    var header = {'title': title,
                  'retrieved': retrieved,
                  'fields': fields,
                  'qualifications': codes,
                  'raw': raw};

    this._header = null;
    return header;
};

Rdb.prototype.pushLines = function (data) {
    var lines = data.split('\n');
    this._lastData = lines.splice(lines.length-1, 1)[0];
    lines.forEach(this.push.bind(this));
};

Rdb.prototype._transform = function (chunk, encoding, done) {
    var data = chunk.toString();
    if (this._lastData)
        data = this._lastData + data;

    if (!this._match) {
        // read stream until the header is complete
        this._lastData = data;
        this._match = /^(#[\s\S]+\t\d+[dmns])$\n([\s\S]*)/m.exec(data);
        if (this._match) {
            this._header = this._match[1];
            this.pushLines(this._match[2]);
        }
    } else {
        this.pushLines(data);
    }
    done();
};

Rdb.prototype._flush = function (done) {
    if (this._lastData)
        this.pushLines(this._lastData);

    this._lastData = null;
    done();
};

module.exports = Rdb;
