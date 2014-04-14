var _ = require('underscore');
// grab information from user to be more specific
var argv = require('optimist')
  .usage('Usage:\n\t$0 run(e.g. ben) rollcall-db(e.g. dev-rollcall)')
  .demand(1)
  .argv;

var RUN = argv._[0];
var ROLLCALL = argv._[1];

// Via http://isolasoftware.it/2012/05/28/call-rest-api-with-node-js/
var https = require('http');
var fs = require('fs');
var jsonObject;


// To add a new COLLECTION please put in an if else that reads the json into jsonObject
if (RUN === "ben") {
    jsonObject = fs.readFileSync('./ben.json', 'utf8');
} else if (RUN === "amanda") {
    jsonObject = fs.readFileSync('./amanda.json', 'utf8');
} else if (RUN === "7BL") {
    jsonObject = fs.readFileSync('./7BL.json', 'utf8');
} else if (RUN === "7MS") {
    jsonObject = fs.readFileSync('./7MS.json', 'utf8');
} else if (RUN === "7DM") {
    jsonObject = fs.readFileSync('./7DM.json', 'utf8');
} else if (RUN === "test") {
    jsonObject = fs.readFileSync('./test.json', 'utf8');
} else {
    console.warn("A unknown collection <"+RUN+"> was choosen.");
    console.error("Exit with error");
    process.exit(1);
}

// prepare the header
var postheaders = {
    'Accept' : 'application/json',
    'Content-Type' : 'application/x-www-form-urlencoded'
};

// the post options
var optionspost = {
    host : 'drowsy.badger.encorelab.org',
    port : 80,
    path : '/'+ROLLCALL+'/users',
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
