if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

//importing dependencies we added in package.json
const express = require("express");

/* An express app allows us to create different urls and endpoints that a user can navigate to in the browser
and then we define code for the server to handle those requests */
const app = express();

const expressLayouts = require("express-ejs-layouts");
const methodOverride = require('method-override')
const compression = require('compression')

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
app.get("/test", async(req, res) => {
  // res.download("server.js"); //download pop-up
  res.status(200).json({
    success: true,
    message: `App is running!`
  });
  // console.log("here");
});

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.set("layout", "layouts/layout");
app.use(expressLayouts);
app.use(methodOverride('_method'))

// built-in middleware function in Express, will put public before path of all css/js files in layout.ejs ;
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
    console.log('Database connected! 🟢');
  }).on('error', err => {
    console.log('Connection failed!');
  });
}
connectDB()

// import routes/controllers
const indexRouter = require("./routes/index");
const authorRouter = require("./routes/authors.min");
const bookRouter = require("./routes/books.min");

/* 📌 middle-ware ; software layer, way to modularize code 
and add additional functionality without modifying the core application. */

// using routes/controllers handlers as middle-wares to handle requests ;
app.use("/", indexRouter);
app.use("/authors", authorRouter);
app.use("/books", bookRouter);

const PORT = process.env.PORT || "5000";
app.listen(PORT, () => console.log(`\nServer is running at http://localhost:${PORT} with environment: ${process.env.NODE_ENV}`));