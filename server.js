'use strict';

const express = require('express');
const favicon = require('serve-favicon');
const bodyParser = require('body-parser');
const app = express();
const https = require('https');
const ejs = require('ejs');

app.enable('trust proxy');
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(favicon(__dirname + '/lib/favicon.ico'));
app.use('/lib', express.static('./lib'));
app.disable('x-powered-by');

const HTTP_PORT = 18080;
const HTTPS_PORT = 14040;

function sendError(errCode, errName, res) {
    res.status(errCode).render("error.ejs", {
        errorCode: errCode,
        errorExp: errName
    });
}
function postError(errCode, errName, res) {
    res.status(errCode).send(errName);
}

/*
app.all('*', (req, res, next) => {
    let protocol = req.headers['x-forwarded-proto'] || req.protocol;
    if (protocol == 'https') next();
    else { let from = `${protocol}://${req.hostname}${req.url}`; 
        let to = `https://${req.hostname}${req.url}`;
        res.redirect(to); 
    }
});
*/

app.get('/', (req, res)=>{
    res.render('lw.ejs');
});

app.post('/wps', (req, res)=>{
    let f = req.body.floor;
    switch(f) {
        case 'b1':
            res.sendFile(__dirname + '/lib/waypoints/b1.json');
            break;
        default:
            sendError(404, 'Not Found', res);
    }
});

//404 handle
app.use('*', function(req, res, next) {
    sendError(404, 'Not Found', res);
});

/*
var options = {
    ca: fs.readFileSync('/etc/letsencrypt/live/tca.r-e.kr/fullchain.pem'),
    key: fs.readFileSync('/etc/letsencrypt/live/tca.r-e.kr/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/tca.r-e.kr/cert.pem')
};
*/

app.listen(HTTP_PORT);
console.log("HTTP server listening on port " + HTTP_PORT);
/*
https.createServer(options, app).listen(HTTPS_PORT, function() {
    console.log("HTTPS server listening on port " + HTTPS_PORT);
});
*/