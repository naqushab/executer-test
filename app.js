//Modules
const express = require('express');
const hbs = require('hbs');
var bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator/check');
var shell = require('shelljs');
var request = require('request');
const { exec } = require('child_process');
const scrapper = require('se-scraper');
const CronJob = require('cron').CronJob;
const fs = require('fs');
var port = process.env.PORT || 3001;
const readConfig =  require('jsonfile').readFileSync;;

//Internal_modules
se = require('./routes/controllers/searchengine');
custom = require('./routes/controllers/customtasks');
core = require('./routes/models/functions');
systemresources = require('./routes/controllers/systemres');

//Load Config File
try {
    var config = readConfig(process.argv[2] || "config.json");
} catch (e) {
    console.log("[error] " + new Date().toGMTString() + " : Server Config Not Found.");
    return process.exit(-1);
}

global.__logPath = config.paths.logs || "./logs";

//Global Variable
process.env.NODE_ENV = config.currentEnv;
global.__namespace = config.namespace;
global.__asset_namespace = config.asset_namespace;
global.__ENV_LIST = config.environments;
// Create Project Directories if Not exists
const dirs = [__logPath];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
});
//Set logger
if (process.env.NODE_ENV == global.__ENV_LIST.development) {
    //Global Debug Function
    global.__debug = function (msg, obj, stringify) {
        if (obj)
            console.log("[debug] " + new Date().toGMTString() + " : " + msg + " => ", ((stringify) ? JSON.stringify(obj) : obj));
        else
            console.log("[debug] " + new Date().toGMTString() + " : " + msg);
        return obj;
    }

    //Global Error Function
    global.__error = function (msg, obj) {
        var data;
        if (obj)
            console.log("[error] " + new Date().toGMTString() + " : " + msg + " => ", obj.stack || JSON.stringify(obj));
        else
            console.log("[error] " + new Date().toGMTString() + " : " + msg);
        return obj;
    }

    //Global Info Function
    global.__info = function (msg, obj, stringify) {
        if (obj)
            console.log("[info] " + new Date().toGMTString() + " : " + msg + " => ", ((stringify) ? JSON.stringify(obj) : obj));
        else
            console.log("[info] " + new Date().toGMTString() + " : " + msg);
        return obj;
    }
    //Global Security Function
    global.__security = function (ip, msg, obj, stringify) {
        if (obj)
            console.log("[security] " + new Date().toGMTString() + " : " + ip + " : " + msg + " => ", ((stringify) ? JSON.stringify(obj) : obj));
        else
            console.log("[security] " + new Date().toGMTString() + " : " + ip + " : " + msg);
        return obj;
    }
} else {
    //Global Debug Function
    global.__debug = function (msg, obj, stringify) {
        if (obj)
            data = ("[debug] " + new Date().toGMTString() + " : " + msg + " => ", ((stringify) ? JSON.stringify(obj) : obj));
        else
            data = ("[debug] " + new Date().toGMTString() + " : " + msg);
        fs.appendFileSync(_logPath + '/debug' + (new Date()).toISOString().split(/[-:]/i).slice(0, 3).join('') + '.log', data)
        return obj;
    }

    //Global Error Function
    global.__error = function (msg, obj) {
        if (obj)
            data = ("[error] " + new Date().toGMTString() + " : " + msg + " => ", obj.stack || JSON.stringify(obj));
        else
            data = ("[error] " + new Date().toGMTString() + " : " + msg);
        fs.appendFileSync(_logPath + '/error' + (new Date()).toISOString().split(/[-:]/i).slice(0, 3).join('') + '.log', data)
        return obj;
    }

    //Global Info Function
    global.__info = function (msg, obj, stringify) {
        if (obj)
            data = ("[info] " + new Date().toGMTString() + " : " + msg + " => ", ((stringify) ? JSON.stringify(obj) : obj));
        else
            data = ("[info] " + new Date().toGMTString() + " : " + msg);
        fs.appendFileSync(_logPath + '/info' + (new Date()).toISOString().split(/[-:]/i).slice(0, 3).join('') + '.log', data)
        return obj;
    }

    //Global Security Function
    global.__security = function (ip, msg, obj, stringify) {
        if (obj)
            data = ("[security] " + new Date().toGMTString() + " : " + ip + " : " + msg + " => ", ((stringify) ? JSON.stringify(obj) : obj));
        else
            data = ("[security] " + new Date().toGMTString() + " : " + ip + " : " + msg);
        fs.appendFileSync(_logPath + '/security' + (new Date()).toISOString().split(/[-:]/i).slice(0, 3).join('') + '.log', data)
        return obj;
    }
}



//Authentication Packages
const session = require('express-session');
var passport = require('passport');
var MySQLStore = require('express-mysql-session')(session);

app = express();
//Installing Express-session
app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());


//Express_middlewares
app.set('view engine', 'hbs');
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/views'));
app.use('/se', se);
app.use('/custom', custom);
app.use('/systemres', systemresources);


//Public_routes
app.get('/', (req, res) => {
    res.render('index', {
        data: 'ENTER USERNAME & PASSWORD'
    });

});

app.post('/', (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    request.post({
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        url: 'http://localhost:3000/api/checkcredentials',
        form: {
            "email": req.body.email,
            "pass": req.body.pass
        },
        json: true
    }, function (error, response, body) {
        if (error) throw new Error(error);
        else if (!error) {
            if (body == 'INCORRECT_CREDENTIALS') {
                console.log(body);

                return res.render('index', {
                    data: 'SORRY, WRONG USERNAME/PASSWORD COMBINATION'
                });
            }
            else if (body == 'error') {
                return res.render('index', {
                    data: 'SORRY,ERROR OCCURED'

                });
            }
            else if (body == 'CORRECT_CREDENTIALS') {
                var updatestatus = new CronJob('*/2 * * * * *', () => {
                    request.post({
                        headers: { 'content-type': 'application/x-www-form-urlencoded' },
                        url: 'http://localhost:3000/api/update_status',
                        form: { "email": req.user },
                        json: true
                    }, (error, response, body) => {
                        if (error) {
                            console.log('ERROR IN UPDATING STATUS' + error);
                        }
                        else if (!error) { console.log('STATUS_UPDATED'); }
                    });
                });
                updatestatus.start();

                //Session_creation_here
                const user_id = req.body.email;
                req.login(req.body.email, (error) => {
                    if (error) {
                        res.redirect('/');
                    }
                    else res.redirect('/dashboard');
                });

            }
        }
    });
});

app.get('/logout', (req, res) => {
    req.logout();
    req.session.destroy();
    res.redirect('/');
});
passport.serializeUser(function (user_id, done) {
    done(null, user_id);
});

passport.deserializeUser(function (user_id, done) {
    done(null, user_id);
});

app.get('/dashboard', (req, res) => {
    console.log(req.user);
    console.log(req.isAuthenticated());
    if (req.isAuthenticated()) {
        rprocess = shell.exec('whoami');
        res.render('dashboard', {
            user_id: req.user,
            rprocess: 'hello ' + rprocess + '!',
            processor: shell.exec('sysctl -n machdep.cpu.brand_string'),
        });
    }
    else {
        res.redirect('/');
    }
});

app.get('/live', (req, res) => {
    if (req.isAuthenticated()) {
        var fileContents;
        try {
            fileContents = fs.readFileSync('localdata.json', 'utf-8');
        } catch (err) {
            fileContents = null;
        }
        if (fileContents != null) {
            logarray = JSON.parse(fileContents);
            logarray.logs.reverse();
            res.render('live', {
                data: logarray.logs,
                google: core.lastsuccessorfailedstatus('google', logarray.logs),
                bing: core.lastsuccessorfailedstatus('bing', logarray.logs),
                baidu: core.lastsuccessorfailedstatus('baidu', logarray.logs),
                infospace: core.lastsuccessorfailedstatus('infospace', logarray.logs),
                duckduckgo: core.lastsuccessorfailedstatus('duckduckgo', logarray.logs),
                custom: core.lastsuccessorfailedstatus('custom', logarray.logs)
            });
        }
        else {
            res.render('live', {
                data: "NO RECORDS YET"
            })
        }
    }
    else res.redirect('/');
});

app.listen(port, () => {
    console.log('SERVER STARTED AT PORT ' + port);

});