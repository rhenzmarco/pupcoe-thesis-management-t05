process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const express = require('express');
const path = require('path');
const { Client } = require('pg');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const moment = require('moment');
const usersFunction = require('./models/user.js')
const customer = require('./models/customer.js')
const PORT = process.env.PORT || 3000

const cookieParser = require('cookie-parser')
var flash = require('connect-flash')

const session = require('express-session')
const passport = require('passport')
const Strategy = require('passport-local').Strategy
const bcrypt = require('bcryptjs')
const saltRounds = 10

const client = new Client({
  database: 'dfvmr1og2brrhf',
  user: 'seophmcycjjjfu',
  password: 'fdb5aca03248a627745593f3d67a82225225f6c5405ae50cacb1fbab49239ed3',
  host: 'ec2-54-163-246-5.compute-1.amazonaws.com',
  port: 5432,
  ssl: true
});
client.connect()
  .then(function () {
    console.log('Connected to database');
  })
  .catch(function (err) {
    console.log('Cannot connect to database');
  });

const app = express();
// tell express which folder is a static/public folder
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.set('port', (process.env.PORT || 3000));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'static1')));
app.use(session({ secret: 'ilove1234', resave: false, saveUninitialized: false }));
app.use
// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize()); 
app.use(passport.session());

// Body Parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser('secret'))
// session
app.use(session({
  secret: 'somerandonstuffs',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false,
    maxAge: 60000 }
}))
app.use(flash())

app.use(passport.initialize())
app.use(passport.session())

passport.use(new Strategy({
  usernameField: 'username',
  passwordField: 'password'
},
function (username, password, cb) {
  usersFunction.getByEmail(client, username, function (user) {
    if (!user) {
      return cb(null, false)
    }
    bcrypt.compare(password, user.password).then(function (res) {
      if (res === false) {
        return cb(null, false)
      }
      return cb(null, user)
    })
  })
}))

passport.serializeUser(function (user, cb) {
  cb(null, user.id)
})

passport.deserializeUser(function (id, cb) {
  usersFunction.getById(client, id, function (user) {
    cb(null, user)
  })
})

function isAdmin (req, res, next) {
  if (req.isAuthenticated()) {
    // console.log("success")
    usersFunction.getCustomerData(client, {id: req.user.id}, function (user) {
      var role = user[0].user_type
      // console.log('role:',role);
      if (role === 'admin') {
        next()
      } else {        req.flash('error', 'Permission denied')
        res.redirect('/')
      }
    })
  } else {
    res.redirect('/login')
  }
}

app.get('/', function (req, res) {
  client.query('SELECT * FROM anno ORDER BY id DESC LIMIT 5;', (req,data)=>{

    var list = [];

    for (var i=0; i< data.rows.length; i++){
      list.push(data.rows[i]);
    }
    res.render('index',{
      data: list,
      title: 'Barangay Tanyag'
    });
  });
});
app.get('/announcement/:id', function (req, res) {
  client.query('SELECT id AS id, image AS image,image1 AS image1,image2 AS image2, name AS name, description AS description FROM anno WHERE id = ' + req.params.id + '; ')
    .then((results) => {
      console.log('results?', results);
      res.render('news1', {
        name: results.rows[0].name,
        description: results.rows[0].description,
        image: results.rows[0].image,
        image1: results.rows[0].image1,
        image2: results.rows[0].image2,
        id: results.rows[0].id
      });
    })
    .catch((err) => {
      console.log('error', err);
      res.send('Error ba?!');
    });
});


//----------------------start about----------------------
app.get('/about/mission', function (req, res) {
  res.render('mission');
});

app.get('/about/history', function (req, res) {
  res.render('history');
});
app.get('/about/barangayprofile', function (req, res) {
  res.render('profile');
});
app.get('/about/puroks', function (req, res) {
  res.render('purok');
});


//----------------------end about-------------------------
//----------------------government-------------------//
app.get('/government/electedofficials', function (req, res) {
  res.render('officials');
});
app.get('/government/ngo', function (req, res) {
  res.render('ngo');
});
//----------------end of government-------------------//
//-----------------start of school-------------------//
app.get('/school/elementary', function (req, res) {
  res.render('elementary');
});

app.get('/school/secondary', function (req, res) {
  res.render('highschool');
});

app.get('/school/preschool', function (req, res) {
  res.render('preschool');
});

//-----------------end of school----------------------//
//adminside
app.get('/admin/dashboard', function (req, res) {
      res.render('adash',{layout: 'admin'});
});
app.get('/admin/announcements', function (req, res) {
client.query('SELECT * FROM anno ORDER BY id DESC;', (req,data)=>{

    var list = [];

    for (var i=0; i< data.rows.length; i++){
      list.push(data.rows[i]);
    }
    res.render('aindex',{
      data: list,
      title: 'Dashboard',
      layout: 'admin'
    });
  });
});
app.get('/admin/addann', function(req,res){
  res.render('addann',{layout: 'admin'});
});
app.get('/admin/hotlines', function (req, res) {
 client.query('SELECT * FROM hotlines ;', (req,data)=>{

    var list = [];

    for (var i=0; i< data.rows.length; i++){
      list.push(data.rows[i]);
    }
    res.render('hotlines',{
      data: list,
      title: 'Emergency Hotlines',
      layout: 'admin'
    });
  });
});
app.get('/admin/addhot', function(req,res){
  res.render ('addhot',{layout: 'admin'});
});
app.get('/login', function (req, res) {
  res.render('login',{layout: 'adminlogin'});
});
app.post('/login', function (req, res) {
     client.query('SELECT user_type AS user_type FROM customers WHERE id= 1; ')
    .then((results) => {
      console.log('results?', results);
        if (user_type = 'admin') {
          res.render('aindex', {layout:'admin'})
        } else {
          res.redirect('/login', {layout:'admin'})
        }
      });
    });
app.get('/signup', function (req, res) {
  res.render('adduser', {layout:'admin'})
})

app.post('/client/signup', function (req, res) {
    var customerData = {
      email: req.body.email,
      password: req.body.password
    }
    customer.getByEmail(client, req.body.email, function (data) {
      if (data.rowCount > 0) {
        res.render('adminlogin', {
          error: true,
          message: 'email already taken'
        })
      } else {
        customer.create(client, customerData, function (customerId) {
          res.redirect('../signup')
        })
      }
    })
})


//end admin side
//post
app.post('/insert_announce', function (req, res) {
client.query("INSERT INTO anno (name, description,tagline, image, image1, image2) VALUES ('" + req.body.name + "', '" + req.body.description + "', '" + req.body.tagline + "','" + req.body.image + "', '" + req.body.image1 + "', '" + req.body.image2 + "')")
  .then((results)=>{
  res.render ('aindex' ,{layout: 'admin'});
})
      .catch((err) => {
      console.log('error', err);
      res.send('Error!');
    });
});
app.post('/insert_hot', function (req, res) {
client.query("INSERT INTO hotlines (name, contactno) VALUES ('" + req.body.name + "', '" + req.body.contact + "')")
  .then((results)=>{
  res.render ('addhot' ,{layout: 'admin'});
})
      .catch((err) => {
      console.log('error', err);
      res.send('Error!');
    });
});

//postend
app.listen(app.get('port'), function () {
  console.log('Server started at port 3000');
});


// app.listen(PORT);