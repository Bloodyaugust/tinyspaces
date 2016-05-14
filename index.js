var compression = require('compression');
var express = require('express');
var fetch = require('node-fetch');
var mongoclient = require('mongodb').MongoClient;
var mongoObjectId = require('mongodb').ObjectId;
var assert = require('assert');
var bodyParser = require('body-parser');
var multer = require('multer');
var cloudinary = require('cloudinary');
var datauri = require('datauri');
var bcrypt = require('bcrypt');
var hat = require('hat');
var mailgun = require('mailgun-js')({apiKey: process.env.MAILGUN_KEY, domain: 'mg.synsugarstudio.com'});
var mustache = require('mustache');

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
var authProtected = function (req, res, next) {
  var cursor = dbConnection.collection('admin').find();

  if (req.body.token) {
    cursor.toArray(function (err, result) {
      if (err) {
        res.json({
          code: 500,
          message: 'Error retrieving admin data'
        });
      } else {
        if (new Date().getTime() < new Date(result[0].tokenExpires).getTime()) {
          if (req.body.token === result[0].token) {
            next();
          } else {
            res.json({
              code: 401,
              message: 'Incorrect token, please login again'
            });
          }
        } else {
          res.json({
            code: 401,
            message: 'Token is expired, please login again'
          });
        }
      }
    });
  } else {
    res.json({
      code: 401,
      message: 'Token is required'
    });
  }
};

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

app.post('/buy', function (req, res) {
  var message = 'Customer: {{name}}\r\nTinySpace: {{{url}}}\r\nAddress: {{address}}\r\nEmail: {{email}}\r\nOrdered: {{date}}',
  cursor;

  cursor = dbConnection.collection('spaces').find({_id: new mongoObjectId(req.body.spaceID)});

  dbConnection.collection('spaces').updateOne({
    _id: new mongoObjectId(req.body.spaceID)
  }, {
    $set: {'sold': true}
  }, function (err, result) {
    if (err) {
      res.json({
        code: 500,
        message: 'There was an error finding that tiny space'
      });
    } else {
      cursor.toArray(function (err2, result2) {
        if (err2) {
          res.json({
            code: 500,
            message: 'There was an error finding that tiny space'
          });
        } else {
          if (result2[0]) {
            req.body.url = result2[0].url;
          }

          mailgun.messages().send({
            from: 'TinySpaces Ordering <mailgun@mg.synsugarstudio.com>',
            to: 'greysonrichey@gmail.com',
            subject: 'New Tiny Space Order',
            text: mustache.render(message, req.body)
          }, function (error, body) {
            if (error) {
              res.json({
                code: 500,
                message: 'There was an error placing your order, try again later'
              });
            } else {
              res.json({
                code: 200,
                message: 'Order placed successfully'
              });
            }
          });
        }
      });
    }
  });
});
app.post('/request', function (req, res) {
  var message = 'Customer: {{name}}\r\nAddress: {{address}}\r\nEmail: {{email}}\r\nOrdered: {{date}}\r\nDetails:\r\n{{description}}';

  req.body.date = new Date();
  mailgun.messages().send({
    from: 'TinySpaces Ordering <mailgun@mg.synsugarstudio.com>',
    to: 'greysonrichey@gmail.com',
    subject: 'New Tiny Space Custom Order',
    text: mustache.render(message, req.body)
  }, function (error, body) {
    if (error) {
      res.json({
        code: 500,
        message: 'There was an error placing your order, try again later'
      });
    } else {
      res.json({
        code: 200,
        message: 'Order placed successfully'
      });
    }
  });
});
app.get('/spaces', function (req, res) {
  var start = parseInt(req.query.start) || 0,
    limit = parseInt(req.query.limit) || 10,
    cursor;

  cursor = dbConnection.collection('spaces').find().skip(start).limit(limit);

  cursor.toArray(function (err, result) {
    if (err) {
      res.json({
        code: 500,
        message: 'Error retrieving spaces'
      });
    } else {
      res.json({
        code: 200,
        spaces: result
      });
    }
  });
});
app.post('/spaces', authProtected, function (req, res) {
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
app.post('/images', multer().single('space'), authProtected, function (req, res) {
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
        message: 'Image upload successful',
        url: result.secure_url
      });
    } else {
      res.json({
        code: 500,
        message: 'Image upload failed'
      });
    }
  });
});
app.post('/login', function (req, res) {
  var cursor = dbConnection.collection('admin').find(),
    mismatch, admin, newToken;

  cursor.toArray(function (err, result) {
    if (err) {
      res.json({
        code: 500,
        message: 'Error retrieving admin data'
      });
    } else {
      if (bcrypt.compareSync(req.body.password, result[0].password)) {
        newToken = hat();

        result[0].token = newToken;
        result[0].tokenExpires = new Date().getTime() + (60 * 60 * 1000); //one day
        dbConnection.collection('admin').save(result[0]);

        res.json({
          code: 200,
          token: newToken
        });
      } else {
        res.json({
          code: 401,
          message: 'Error in password, try again'
        });
      }
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
