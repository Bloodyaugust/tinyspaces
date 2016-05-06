var compression = require('compression');
var express = require('express');
var fetch = require('node-fetch');
var mongoclient = require('mongodb').MongoClient;
var assert = require('assert');
var bodyParser = require('body-parser');
var multer = require('multer');
var cloudinary = require('cloudinary');
var datauri = require('datauri');

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

var dbConnection;
mongoclient.connect(process.env.DB_URL, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server.");

  dbConnection = db;
});

cloudinary.config({
  cloud_name: 'syntactic-sugar-studio',
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

app.use(bodyParser.json());
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
app.post('/spaces', function (req, res) {
  dbConnection.collection('spaces').save(req.body, function (err, result) {
    if (err) {
      res.json({
        code: 500,
        message: 'Something broke!'
      });
    } else {
      res.json({
        code: 200,
        message: 'Space successfully saved'
      });
    }
  });
});
app.get('/images', function (req, res) {
  var start = parseInt(req.query.start) || 0,
    limit = parseInt(req.query.limit) || 10,
    cursor;

  cursor = dbConnection.collection('images').find().skip(start).limit(limit);

  cursor.toArray(function (err, result) {
    if (err) {
      res.json({
        code: 500,
        message: 'Error retrieving images'
      });
    } else {
      res.json({
        code: 200,
        images: result
      });
    }
  });
});
app.post('/images/upload', multer().single('space'), function (req, res) {
  var base64Image = new datauri();

  base64Image.format(req.file.originalname.split('.')[1], req.file.buffer);

  cloudinary.uploader.upload(base64Image.content, function (result) {
    if (result.secure_url) {
      dbConnection.collection('images').save({
        url: result.secure_url,
        created: new Date()
      });

      res.json({
        code: 200,
        message: 'Image upload successful'
      });
    } else {
      res.json({
        code: 500,
        message: 'Image upload failed'
      });
    }
  });
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
