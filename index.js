var compression = require('compression');
var express = require('express');
var fetch = require('node-fetch');
var mongoclient = require('mongodb').MongoClient;
var assert = require('assert');

var app = express();

var distMode = (process.argv[2] === 'dist');
var port = process.env.PORT || 8085;

var tinySpaces = [];

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  next();
}

app.use(allowCrossDomain);
app.use(compression());
if (distMode) {
  app.use(express.static('public'));
} else {
  app.use(express.static('app'));
}
app.use('/bower_components', express.static('bower_components'));

app.get('/spaces', function (req, res) {
  res.send(tinySpaces);
});

mongoclient.connect(process.env.DB_URL, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server.");
  db.close();
});

app.listen(port, function () {
  console.log('Listening on port ' + port + ' in ' + (distMode ? 'dist' : 'dev') + ' mode');
});

fetch('https://api.imgur.com/3/album/cgr9l', {
  headers: {
    Authorization: 'Client-ID 7618d54c4d7628a'
  }
}).then(function (resp) {
  return resp.json();
}).then(function (json) {
  tinySpaces = [];

  for (var i = 0; i < json.data.images.length; i++) {
    tinySpaces.push(json.data.images[i].link);
  }

  tinySpaces = JSON.stringify(tinySpaces);
});

if (distMode) {
  setInterval(function () {
    fetch('https://api.imgur.com/3/album/cgr9l', {
      headers: {
        Authorization: 'Client-ID 7618d54c4d7628a'
      }
    }).then(function (resp) {
      return resp.json();
    }).then(function (json) {
      tinySpaces = [];

      for (var i = 0; i < json.data.images.length; i++) {
        tinySpaces.push(json.data.images[i].link);
      }

      tinySpaces = JSON.stringify(tinySpaces);
    });
  }, 1000 * 86400);
}
