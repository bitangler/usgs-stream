usgs-stream
===========

A node.js application to asynchronously transform a stream of
[USGS tab-delimited (rdb) water data][1] to JSON.

Note: The [USGS Instantaneous Values Web Service][2] is the official
way to do this sort of thing.

Installation
------------

    npm install usgs-stream

Start Server
------------

    $ usgs_stream
    usgs-stream listening to http://127.0.0.1:5000/

Usage
-----

Retrieve data using the URL format

    http://127.0.0.1:5000/[site number]

Example: Request data from [Point of Rocks, MD][3] (site 01638500)

    curl http://127.0.0.1:5000/01638500

or open the URL in your browser (see a [live example][4]).

A JSON object is returned (see below) -- a straightforward conversion
of the original tab-delimited data.

### Time Parameters ###

The date and time range retrieved can be selected in two ways.

#### Option 1: Period (default) ####

* period=P*x*D: Number of days *x* (before now) that are returned
  [default: *x* = 7 days]

Example: Return data for the last 5 days

    http://127.0.0.1:5000/01638500?period=P5D

If it's 3 pm on Saturday, this will return data from 3 pm last Monday.

#### Option 2: Date range ####

* startDT=YYYY-MM-DD
* endDT=YYYY-MM-DD

Example: Return data from March 3 to March 12, 2015

    http://127.0.0.1:5000/01638500?startDT=2015-03-03&endDT=2015-03-12

This will return data from midnight on March 3 to 23:59 on March 12
in the local time of the USGS site.

The time can be provided using the ISO-8601 format `YYYY-MM-DDTHH:MM`
in the local time zone, or `YYYY-MM-DDTHH:MMZ` for UTC.

JSON Output
-----------

The returned JSON object has the following format.

* `header`: Metadata header
    - `header.title`: Site title
    - `header.retrieved`: Date the data was retrieved
    - `header.fields`: Data fields
        + `header.fields.desc`: Description of each field
        + `header.fields.type`: Data type (date, month, numeric, or string)
    - `header.qualifications`: Data value qualification codes that appear in the data set
    - `header.raw`: Original header

* `data`: An array of data rows, where each row has the following properties
    - `data.agency_cd`: Agency collecting the data or maintaining the site
    - `data.site_no`: USGS site identification number
    - `data.datetime`: Local date and time in ISO-8601 format
    - `data.tz_cd`: Local time zone
    - `data.nn_nnnnn`: Measured data value (described in `header.fields`)
    - `data.nn_nnnnn_cd`: Qualification code for this data point (described in `header.qualification`)
    - `data.utc`: UTC date and time in ISO-8601 format


[1]: http://help.waterdata.usgs.gov/faq/about-tab-delimited-output
[2]: http://waterservices.usgs.gov/rest/IV-Service.html
[3]: http://waterdata.usgs.gov/nwis/uv?site_no=01638500
[4]: http://usgs-stream.bitangler.com/01638500
