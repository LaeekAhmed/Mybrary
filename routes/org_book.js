import express from 'express';
const router = express.Router();
import Book from '../models/book.js'; //import db file
import Author from '../models/author.js'; //import db file
import PDFJS from 'pdfjs';

/* import/methods to deal with cover image:
firstly we need to create the image file in the folder after the user uploads it,then get the name and save it */

import multer from 'multer'; //allows us to work with multipart forms (file-form)

import path from 'path'; //built-in library
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif'] //accepted image-type list
const uploadPath = path.join('public', 'pdfs') //'public/uploads/bookCovers'
import fs from 'fs'; // filesys -> to delete book covers created while no new entry for book was created due to error
//func to create file and place it in the dest folder.
const upload = multer({
  dest: uploadPath,
  fileFilter: (req, file, callback) => {
    callback(null, imageMimeTypes.includes(file.mimetype)) //checking if the user-provided file is in the accepted image type.
  }

})

// all-search books route
router.get("/", async (req, res) => {
  // let searchOptions = {};
  // // req.query instead of req.body since this is a get NOT post action;
  // if (req.query.title != null && req.query.title !== "") {
  //   /* RegExp => searching for "yl" will also include "kyle","jo" will include "john"
  //    i => case insensitive*/
  //   searchOptions.title = new RegExp(req.query.title, "i");
  // }
  // try{
  //     const books = await Book.find(searchOptions);
  let query = Book.find()
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
    res.render("books/index", {
      books: books,
      searchOptions: req.query
    });
  } catch {
    res.redirect("/");
  }
});

// new book route
router.get("/new", async (req, res) => {
  renderNewPage(res, new Book())
});

// open local file
router.get('/asset', function (req, res) {
  var tempFile = "C:/Users/User/Downloads/web_dev/MEN-project/public/pdfs/del54.pdf";
  fs.readFile(tempFile, function (err, data) {
    res.contentType("application/pdf");
    res.send(data);
  });
});

// Create book Route
router.post("/", upload.single('myfile'), async (req, res) => {
  // req.file is the uploaded file.
  const fileName = req.file != null ? req.file.filename : null
  console.log(fileName)
  // new entry "book" into table "Book"
  const book = new Book({
    title: req.body.title,
    author: req.body.author,
    publish_date: req.body.publishDate, // converting from string
    description: req.body.description
  })
  saveCover(book, req.body.cover)

  try {
    const newBook = await book.save()
    //res.redirect(`books/${newBook.id}`)
  } catch {
    renderNewPage(res, book, true)
  }
})

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

// Show Book Route
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
    const author = await Author.findById(book.author)
    res.render('books/show', { book: book, author: author })
  } catch {
    res.redirect('/')
  }
})

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
    const books = await Book.findById(req.params.id)
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

// Functions ;----------------------------------------------------------------------------------------------------

function saveCover(book, coverEncoded) {
  if (coverEncoded == null) return
  const cover = JSON.parse(coverEncoded)
  if (cover != null && imageMimeTypes.includes(cover.type)) {
    book.coverImage = new Buffer.from(cover.data, 'base64')
    book.coverImageType = cover.type
  }
}

function savePdf(book, coverEncoded) {
  if (coverEncoded.length != 0) {
    console.log('cp1')
    const pdf = JSON.parse(coverEncoded)
    console.log('cp2')
    if (pdf != null) {
      console.log('cp3')
      book.Doc = new Buffer.from(pdf.data, 'base64')
      book.DocType = pdf.type
      console.log('Doc : ', book.DocType, pdf.data.length)
    }
  }
  else {
    console.log('cp4')
    book.Doc = ''
    book.DocType = ''
  }
}

export default router;
