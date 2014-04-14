var _ = require('underscore');
// grab information from user to be more specific
var argv = require('optimist')
  .usage('Usage:\n\t$0 database server(default:drowsy.badger.encorelab.org) port(default: 80)')
  .demand(1)
  .argv;

var database = argv._[0];
// var server = argv._[1];
// var port = argv._[2];

// Via http://isolasoftware.it/2012/05/28/call-rest-api-with-node-js/
var https = require('http');
var fs = require('fs');

var jsonObject = fs.readFileSync('./tags.json', 'utf8');


// prepare the header
var postheaders = {
    'Accept' : 'application/json',
    'Content-Type' : 'application/x-www-form-urlencoded'
};

// the post options
var optionspost = {
    host : 'drowsy.badger.encorelab.org',
    port : 80,
    path : '/'+database+'/tags',
    method : 'POST',
    headers : postheaders
};

console.info('Options prepared:');
console.info(optionspost);
console.info('Do the POST calls');


var array = JSON.parse(jsonObject);

var date = new Date();

_.each(array, function(doc){
    var reqPost = https.request(optionspost, function(res) {
        console.log("statusCode: ", res.statusCode);
        // uncomment it for header details
        console.log("headers: ", res.headers);

        res.on('data', function(d) {
            console.info('POST result:\n');
            process.stdout.write(d);
            console.info('\n\nPOST completed');
        });
    });

    // set current dates (created_at and modified_at)
    doc.created_at = date;
    if (!doc.modified_at) {
        doc.modified_at = date;
    }

    // write the json data
    var jsonObj = JSON.stringify(doc);
    reqPost.write(jsonObj);
    reqPost.end();
    reqPost.on('error', function(e) {
        console.error(e);
    });
});
