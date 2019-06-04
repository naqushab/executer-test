var fs = require("fs");
var shell = require('shelljs');
var request =require('request');
var shell = require('shelljs');



var apilog = (engine, success, url, timestamp, params) => {
    calllog = {
        engine: engine,
        success: success,
        endpoint: url,
        timestamp: timestamp,
        params: params
    };
    fs.readFile('localdata.json', 'utf8', function readFileCallback(err, data) {
        if (err) {
            fs.open('localdata.json', 'w', function (err, file) {
                if (err) throw err;
                console.log('Saved!');
            });
            console.log(err);
        } else {
            core.updatetoredisqueue(engine,shell.exec('ifconfig en1 | awk "/ether/{print $2}"').stdout);
            obj = JSON.parse(data); //Now it an object
            obj.logs.push(calllog); //Add some data
            json = JSON.stringify(obj); //Convert it back to json
            fs.writeFile('localdata.json', json, 'utf8', (err) => {
                if (err) console.log(err);

            }); //Write it back 
        }
    });

};

var statusupdater = (engine) => {
    fs.readFile('localdata.json', 'utf-8', (err, data) => {
        if (err) {
            return 'status could not be updated \n ' + err;
        }
        else if (!err) {
            obj = JSON.parse(data); //Log array
            logarray = obj.logs;
            logarray.forEach(log => {
                if (log.engine == engine) {

                }
            });

        }
    });
}

var lastsuccessorfailedstatus = (engine, array) => {
    var i = 0;
    for (i = 0; i < array.length; i++) {
        if (array[i].engine == engine) {
            var status = array[i].success;
            if (status == 0) {
                currentstatus = 0;
                lastfailedtimestamp = array[i].timestamp;
                lastsuccesstimestamp = 'NO DATA FOUND';
                for (j = 0; j < array.length; j++) {
                    check2 = 0;
                    if (array[j].engine == engine && array[j].success == 1) {
                        lastsuccesstimestamp = array[j].timestamp;
                        break;
                    }
                }
                returnvalues = {
                    currentstatus,
                    lastfailedtimestamp,
                    lastsuccesstimestamp,
                    currentstatus
                };
            }
            else if (status == 1) {
                currentstatus = 1;
                lastsuccesstimestamp = array[i].timestamp;
                lastfailedtimestamp = 'NO DATA FOUND';
                for (j = 0; j < array.length; j++) {
                    if (array[j].engine == engine && array[j].success == 0) {
                        lastfailedtimestamp = array[j].timestamp;
                        break;
                    }
                }
                returnvalues = {
                    currentstatus,
                    lastfailedtimestamp,
                    lastsuccesstimestamp,
                    currentstatus
                };

            }
            return returnvalues;
            break;
        }
    }
}

var updatetoredisqueue = (engine,machine_add) => {
    request.post({
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        url: 'http://localhost:3000/api/updateenginestatus',
        form: {
            "engine": engine,
            "machine_add":machine_add
        },
        json: true
    }, function (error, response, body) {
        if(error){
            console.log(error);
            console.log('FAILED TO UPDATE STATUS TO QUEUE: '+engine);
        }
        if(!error){
            console.log('STATUS OF '+engine+' UPDATED BY CLIENT \n RESPONSE BY SERVER');
            console.log(body);
        }
    });



}

var processor = shell.exec('sysctl -n machdep.cpu.brand_string').trim();
var freeram = shell.exec("top -l 1 -s 0 | grep PhysMem").trim();
var os = shell.exec('system_profiler SPSoftwareDataType | grep "System Version"').trim();

module.exports = {
    apilog,
    processor,
    freeram, os, statusupdater,
    lastsuccessorfailedstatus,updatetoredisqueue
}