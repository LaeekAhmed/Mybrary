if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
//importing dependencies we added in package.json
const express = require("express");
const app = express();
const expressLayouts = require("express-ejs-layouts");
const methodOverride = require('method-override')
const compression = require('compression')
const router = express.Router()
const Book = require('./models/book')

//import routes/controllers
const indexRouter = require("./routes/index");
const authorRouter = require("./routes/authors.min");
const bookRouter = require("./routes/books.min");
// let alert = require('alert'); 

// gzip compression
app.use(
  compression({
    level: 6,
    // bytes;
    threshold: 10*1000,
    filter: (req,res) => {
      if (req.headers['x-no-compression']){
        return false
      }
      return compression.filter(req,res)
    },
  })
)
// download pop-up test
// app.get("/", async(req, res) => {
//   // res.download("server.js"); //download pop-up
//   res.render('test')
//   console.log("here");
// });

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.set("layout", "layouts/layout");
app.use(expressLayouts);
app.use(methodOverride('_method'))
app.use(express.static("public"));
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

// Database connection
const mongoose = require("mongoose");
const { fileLoader } = require("ejs");

function connectDB() {
  // Database connection
  mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true});
  const connection = mongoose.connection;
  connection.once('open', () => {
      console.log('------------------------------')
      console.log('Database connected ✅');
  }).on('error',err => {
      console.log('Connection failed ⚠️');
  });
}
connectDB()

// using routes/controllers (files imported above) ;
app.use("/", indexRouter);
app.use("/authors", authorRouter);
app.use("/books", bookRouter);

app.listen(process.env.PORT || 3000);
