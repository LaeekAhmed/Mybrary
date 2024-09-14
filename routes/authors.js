import express from 'express';
const router = express.Router();
import Author from '../models/author.js'; //db file
import Book from '../models/book.js';
import pkg from 'express-openid-connect';
const { requiresAuth } = pkg;

/* 
GET all authors route, async func makes working with mongoose easier with the await feature
procedure => .get('/authors') -> render(authors/index.ejs) -> (submit search) -> .get('/authors?name=....')
*/

router.get("/", async (req, res) => {
  // variable was named query b4 but query was NOT the same as req.query, just to name ;
  let query2 = Author.find()

  // req.query instead of req.body since this is a `get` NOT `post` action ;
  if (req.query.name != null && req.query.name != '') {
    console.log("query type: " + typeof (req.query.name))
    // if name starts with space, remove it
    if (req.query.name[0] == ' ') req.query.name = req.query.name.substring(1);
    // RegExp/regex => searching for "yl" will also include "kyle","jo" will include "john", i => case insensitive
    query2 = query2.regex('name', new RegExp(req.query.name, 'i'))
  }
  try {
    const authors = await query2.exec();
    res.json({ authors, searchOptions: req.query });
  } catch (error) {
    res.status(500).json({ error: 'An error occ urred while fetching authors.' });
  }
});

// new author route
router.get("/new", requiresAuth(), (req, res) => {
  res.render("authors/new", { author: new Author() });
});
// .get(/new) -> new.ejs ->(submit) .post(/)

// Create Author Route ; req.body is the data sent by user in the form
router.post("/", async (req, res) => {
  console.log("POST /authors", req.body);

  const author = new Author({
    name: req.body.name,
  });

  try {
    const newAuthor = await author.save();

    // Check the Accept header to determine the response type
    if (req.accepts('html')) {
      res.redirect(`authors/${newAuthor.id}`);
    } else if (req.accepts('json')) {
      res.status(201).json({
        success: true,
        message: 'Author created successfully',
        data: newAuthor
      });
    } else {
      res.status(406).send('Not Acceptable');
    }
  } catch (error) {
    console.log("Error:", error);

    if (req.accepts('html')) {
      res.render("authors/new", {
        author: author,
        errorMessage: "Error creating Author",
      });
    } else if (req.accepts('json')) {
      res.status(500).json({
        success: false,
        message: "Error creating Author",
        error: error.message
      });
    } else {
      res.status(406).send('Not Acceptable');
    }
  }
});

// 📌 u can only make post,get req from a browser,for put,delete we need method-override lib
router.get('/:id', async (req, res) => {
  try {
    const author = await Author.findById(req.params.id)
    const books = await Book.find({ author: author.id })
    res.render('authors/show', {
      author: author,
      booksByAuthor: books
    })
  } catch (err) {
    console.log(err)
    res.redirect('/')
  }
})

// 📌 url with /:id is dynamic ;
router.get('/:id/edit', requiresAuth(), async (req, res) => {
  try {
    const author = await Author.findById(req.params.id)
    res.render('authors/edit', { author: author })
  } catch {
    res.redirect('/authors')
  }
})


// procedure => .get('/:id/edit') -> render(authors/edit.ejs) ->(submit) .put('/:id'), put request is used to edit/update :
router.put('/:id', requiresAuth(), async (req, res) => {
  let author // defined outside try so that it can be accessed in catch
  try {
    author = await Author.findById(req.params.id)
    author.name = req.body.name
    // console.log("up : ",author,' name : ',req.body.name)
    await author.save();
    res.redirect(`${author.id}`);
    /* res.redirect(`authors/${author.id}`); ❌ since redirect joins initial url with given; /authors + /authors/id
    putting back slash infront -> new path, else relative path*/
  } catch {
    if (author == null) {
      res.redirect('/')
    } else {
      res.render('authors/edit', {
        author: author,
        errorMessage: 'Error updating Author'
      })
    }
  }
})


router.delete('/:id', requiresAuth(), async (req, res) => {
  const books = await Book.find({ author: req.params.id })
  let author
  try {
    author = await Author.findById(req.params.id)
    await author.remove()
    res.redirect('/authors')
  } catch {
    if (author == null) {
      res.redirect('/')
      // if author has book linked;
    } else {
      res.render(`authors/show`,
        { author: author, booksByAuthor: books, errorMessage: 'Author has Linked books!' })
    }
  }
})

export default router;
