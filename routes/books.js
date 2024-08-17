import express from 'express';
const router = express.Router();
import { readFile } from 'node:fs/promises';
// filesys -> to read file contents (OR) delete book covers created while no new entry for book was created due to error, `.promises` allows us to use await with readFile
import dotenv from 'dotenv';
import path from 'path';

//import db files (they export resp db Doc & Author) ;
import Doc from '../models/book.js';

import Author from '../models/author.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import multer from 'multer'; //allows us to work with multipart forms (file-form)'
import { clerkClient, ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { s3 } from '../index.js';
import { Upload } from '@aws-sdk/lib-storage';

/* imports/methods to deal with cover image:
firstly we need to create the image file in the folder after the user uploads it,then get the name and save it */

// const multerS3 = require("multer-s3-v2");
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif'] //accepted image-type list
// const uploadPath = path.join('public','pdfs') //'public/uploads/bookCovers'

// Get all books route
router.get("/", async (req, res) => {
  try {
    let query = Doc.find().select('-coverImage -coverImageType'); // Exclude coverImage and coverImageType fields

    if (req.query.title) {
      query = query.regex('title', new RegExp(req.query.title, 'i'));
    }
    if (req.query.publishedBefore) {
      query = query.lte('publish_date', req.query.publishedBefore);
    }
    if (req.query.publishedAfter) {
      query = query.gte('publish_date', req.query.publishedAfter);
    }

    const books = await query.exec();

    // Check the Accept header to determine the response type
    if (req.accepts('html')) {
      res.render("books/index", {
        books: books,
        searchOptions: req.query
      });
    } else if (req.accepts('json')) {
      res.json({
        success: true,
        data: books,
        searchOptions: req.query
      });
    } else {
      res.status(406).send('Not Acceptable');
    }
  } catch (e) {
    console.log("error", e);
    if (req.accepts('html')) {
      res.redirect("/");
    } else {
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching the books."
      });
    }
  }
});

// new book route & its route handler function ;
router.get('/new', async (req, res) => {
  renderNewPage(res, new Doc())
});

// Create book Route & its route handler function, called by `new.ejs`
router.post('/', ClerkExpressRequireAuth(), (req, res) => {
  console.log(JSON.stringify(req.body, null, 2))
  //func to create file and place it in the dest folder.
  let storage = multer.diskStorage({
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName)
    },
  });

  // 100mb size limit ;
  let upload = multer({ storage, limits: { fileSize: 1000000 * 100, fieldSize: 2 * 1024 * 1024 }, }).single('userFile');
  upload(req, res, async (err) => {

    // validate request
    if (!req.file) {
      console.log('no file uploaded')
      return res.json({ error: 'All fields are required!' })
    }
    if (err) {
      console.log('err = ', err + ' , try to use a image with size <= 500 kb ')
      return res.status(500).send({ error: err.message + ', try to use a image with size <= 500 kb ' });
    }
    console.log('\nfile = ', req.file.filename)

    // Configure the upload details to send to S3
    const params = {
      Bucket: 'note-spot',
      // read contents of the file at the provided path ;
      Body: await readFile(req.file.path),
      Key: req.file.filename,
      ContentType: req.file.mimetype,
    }

    // upload to bucket
    const uploadedFile = await new Upload({
      client: s3,
      params,
    }).done()
    console.log('uploaded to aws:\n', uploadedFile.Location)

    const req_user = await clerkClient.users.getUser(req.auth.userId);

    // storing new entry in collection 'books/Book in MONGO DB'
    const book = new Doc({ // Doc is the database name
      title: req.body.title,
      description: req.body.description,
      publish_date: req.body.publishDate, // converting from string
      path: req.file.path,
      size: req.file.size,
      uuid: uuidv4(),
      file_name: req.file.filename,
      file_url: uploadedFile.Location,
      author: req_user.id,
      author_name: `${req_user.firstName} ${req_user.lastName}`
    })
    // saveCover(book, req.body.cover)

    try {
      const newBook = await book.save();
      if (req.accepts('json')) {
        res.status(201).json({
          success: true,
          message: 'Book created successfully',
          data: newBook
        });
      } else {
        res.redirect(`books/${newBook.id}`);
      }
    } catch (error) {
      // Removing file from S3 if posting causes error
      var params2 = { Bucket: 'note-spot', Key: req.file.filename };
      s3.deleteObject(params2, function (err, data) {
        if (err) console.log('s3 del err (from post): ', err, err.stack);
        else console.log('file deleted from S3 (from post)');
      });
      if (req.accepts('json')) {
        res.status(500).json({
          success: false,
          message: 'Error creating book',
          error: error.message
        });
      } else {
        renderNewPage(res, book, true);
      }
    }
  });
});

async function renderNewPage(res, book, hasError = false) {
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
    res.render('books/new', params)
  } catch {
    res.redirect('/books')
  }
}

// Show Book Route & its route handler function ;
router.get('/:id', async (req, res) => {
  try {
    const book = await Doc.findById(req.params.id)
    const author = await Author.findById(book.author)
    res.render('books/show', { book: book, author: author });
  } catch {
    res.redirect('/')
  }
})

// open pdf route
router.get('/download/:uuid', async (req, res) => {
  // Extract link and get file from storage send download stream 
  const file = await Doc.findOne({ uuid: req.params.uuid });
  // Link expired
  if (!file) {
    return res.render('files/download', { error: 'Link has been expired.' });
  }
  const response = await file.save();
  const filePath = `${__dirname}/../${file.path}`;
  res.download(filePath);
  // fs.readFile(filePath, function (err,data){
  //     res.contentType("application/pdf");
  //     res.send(data);
  // });
});

// edit book route & its route handler function ;
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
    var params = { Bucket: 'note-spot', Key: books.file_name };
    s3.deleteObject(params, function (err, data) {
      if (err) console.log('s3 del err : ', err, err.stack);
      else console.log('file deleted from S3');
    });

    // removing file from db
    await books.remove()
    res.redirect('/books')

  } catch {
    if (books != null) {
      res.render('books/show', {
        book: books,
        errorMessage: 'Could not remove Book!'
      })
    }
    res.redirect('/')
  }
});

// Functions :

// function saveCover(book, coverEncoded) {
//   if (coverEncoded == null) return
//   const cover = JSON.parse(coverEncoded)
//   if (cover != null && imageMimeTypes.includes(cover.type)) {
//     book.coverImage = new Buffer.from(cover.data, 'base64')
//     book.coverImageType = cover.type
//   }
// }

const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex')

export default router;