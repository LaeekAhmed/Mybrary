const express = require("express");
const router = express.Router();
const Doc = require("../models/book"); //import db file
const Author = require("../models/author"); //import db file
const { v4: uuidv4 } = require('uuid');
const crypto =  require('crypto');
const aws = require("aws-sdk");
// const { S3Client, PutObject } =  require("@aws-sdk/client-s3");

/* imports/methods to deal with cover image:
firstly we need to create the image file in the folder after the user uploads it,then get the name and save it */

const multer = require('multer') //allows us to work with multipart forms (file-form)
// const multerS3 = require("multer-s3-v2");
const path = require('path') //built-in library
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif'] //accepted image-type list
// const uploadPath = path.join('public','pdfs') //'public/uploads/bookCovers'
// filesys -> to delete book covers created while no new entry for book was created due to error ;
const fs = require('fs') 

const s3 = new aws.S3({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_BUCKET_REGION,
});

//func to create file and place it in the dest folder.
let storage = multer.diskStorage({
  filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
            cb(null, uniqueName)
  } ,
});

let upload = multer({ storage, limits:{ fileSize: 1000000 * 100,fieldSize: 2 * 1024 * 1024 }, }).single('myfile'); //100mb

// all-search books route
router.get("/", async (req, res) => {
  // get from org!!!
      let query = Doc.find()
      if (req.query.title != null && req.query.title != '') {
        query = query.regex('title', new RegExp(req.query.title, 'i'))
      }
      if (req.query.publishedBefore != null && req.query.publishedBefore != '') {
        query = query.lte('publish_date', req.query.publishedBefore)
      }
      if (req.query.publishedAfter != null && req.query.publishedAfter != '') {
        query = query.gte('publish_date', req.query.publishedAfter)
      }
      try {
        const books = await query.exec()
        res.render("books/index",{
            books : books,
            searchOptions: req.query
        });
    } catch{
        res.redirect("/");
    }
});

// new book route
router.get("/new", async (req, res) => {
    renderNewPage(res,new Doc())
});

// open local file
// router.get('/asset', function(req, res){
//   var tempFile="C:/Users/User/Downloads/web_dev/MEN-project/public/pdfs/del54.pdf";
//   fs.readFile(tempFile, function (err,data){
//      res.contentType("application/pdf");
//      res.send(data);
//   });
// });

// Create book Route
router.post('/', (req, res) => {
  //storing file 
  upload(req, res, async (err) => {
      // validate request
      if(!req.file){
        return res.json({error : 'All fields are required!'})
      }
      if (err) {
        return res.status(500).send({ error: err.message+', try to use a image with size <= 500 kb ' });
      }
      console.log('file = ',req.file.filename)
      // Configure the upload details to send to S3
      const params = {
        Bucket: 'note-spot',
        Body: fs.readFileSync(req.file.path),
        Key: req.file.filename,
        ContentType: req.file.mimetype,
        }
      // Uploading files to the bucket
      const uploadedImage = await s3.upload(params).promise()
      console.log('aws done : ',uploadedImage.Location)
      // storing new entry in collection 'books/Book'
      const book = new Doc({ // Doc is the database name
          title : req.body.title,
          description : req.body.description,
          publish_date : req.body.publishDate, // converting from string
          path: req.file.path,
          size: req.file.size,
          uuid: uuidv4(),
          file_name : req.file.filename,
          file_url : uploadedImage.Location,
          author : req.body.author,
      })
      saveCover(book, req.body.cover)

      try{
          const newBook = await book.save();
          //res.send('done')
          res.redirect(`books/${newBook.id}`)
      } catch {
          // removing file from s3 if posting causes error ;
          var params2 = {  Bucket: 'note-spot', Key: req.file.filename};
          s3.deleteObject(params2, function(err, data) {
              if (err) console.log('s3 del err (from post): ',err, err.stack);
              else     console.log('file deleted from S3 (from post)');        
          });
          renderNewPage(res, book, true)
      }
    });
});

async function renderNewPage(res, book,hasError = false) {
  try {
    const authors = await Author.find({})
    const params = {
      authors: authors,
      book: book
    }
    if (hasError) {
        params.errorMessage = 'Error Creating Book'
    }
    //res.render(`books/${form}`, params)
    res.render('books/new',params)
  } catch {
    res.redirect('/books')
  }
}

// Show Book Route
router.get('/:id', async (req, res) => {
  try {
    const book = await Doc.findById(req.params.id)
    const author = await Author.findById(book.author)
    res.render('books/show', { book: book,author : author});
  } catch {
    res.redirect('/')
  }
})

// open pdf route
router.get('/download/:uuid', async (req, res) => {
  // Extract link and get file from storage send download stream 
  const file = await Doc.findOne({ uuid: req.params.uuid });
  // Link expired
  if(!file) {
       return res.render('files/download', { error: 'Link has been expired.'});
  } 
  const response = await file.save();
  const filePath = `${__dirname}/../${file.path}`;
  res.download(filePath);
  // fs.readFile(filePath, function (err,data){
  //     res.contentType("application/pdf");
  //     res.send(data);
  // });
});

// edit book route
router.get("/:id/edit", async (req, res) => {
  res.send("edit book")
});

// update book route
router.put("/:id", async (req, res) => {
  res.send("update book")
});

// delete book route
router.delete("/:id", async (req, res) => {
  let books
  try {
    const books = await Doc.findById(req.params.id)
    // removing file from s3
    var params = {  Bucket: 'note-spot', Key: books.file_name };
    s3.deleteObject(params, function(err, data) {
        if (err) console.log('s3 del err : ',err, err.stack);
        else     console.log('file deleted from S3');        
    });
    // removing file from db
    await books.remove()
    res.redirect('/books')
  } catch {
    if(books != null){
      res.render('books/show',{
        book : books,
        errorMessage : 'Could not remove Book!'
      })
    }
    res.redirect('/')
  }
});

// Functions ;----------------------------------------------------------------------------------------------------

function saveCover(book, coverEncoded) {
  if (coverEncoded == null) return
  const cover = JSON.parse(coverEncoded)
  if (cover != null && imageMimeTypes.includes(cover.type)) {
    book.coverImage = new Buffer.from(cover.data, 'base64')
    book.coverImageType = cover.type
  }
}

const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex')

module.exports = router;