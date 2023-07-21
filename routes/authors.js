const express = require("express");
const router = express.Router();
const Author = require("../models/author"); //db file
const Book = require("../models/book");
const { requiresAuth } = require('express-openid-connect')

/* 📌 all/search authors route, async func makes working wiht mongoose easier/await feature
req is the incoming data from user, res is the outgoing data we want to send to the user/reqester */
router.get("/", async (req, res) => {

  // variable was named query b4 but query was NOT the same as req.query, just to name ;
  let query2 = Author.find()
  
    //📌 req.query instead of req.body since this is a get NOT post action ;
    if (req.query.name != null && req.query.name != ''){
        console.log(typeof(req.query.name))
        if(req.query.name[0]==' ') req.query.name = req.query.name.substring(1);
        query2 = query2.regex('name', new RegExp(req.query.name, 'i'))
    }
    /* RegExp/regex => searching for "yl" will also include "kyle","jo" will include "john", i => case insensitive*/
    try {
      const authors = await query2.exec()
      res.render("authors/index", {
        authors: authors,
        searchOptions: req.query,
      });
    } catch {
      res.redirect("/");
    }
});
// procedure ✳️ => .get('/authors') -> render(authors/index.ejs) ->(submit) .get('/authors?name=....')

// new author route
router.get("/new", requiresAuth(), (req, res) => {
  res.render("authors/new", { author: new Author() });
});
// .get(/new) -> new.ejs ->(submit) .post(/)

// 📌 Create Author Route ; req.body is the data sent by user in the form
router.post("/", async (req, res) => {

  // new entry "author" into table "Author"
  const author = new Author({
    name: req.body.name,
  });
  
  try {
    const newAuthor = await author.save();
    console.log("1",author)
    console.log("2",newAuthor)
    res.redirect(`/authors/${newAuthor.id}`);
  } catch {
    res.render("authors/new", {
      author: author,
      errorMessage: "Error creating Author",
    });
  }
});
/* res.redirect(`authors/${author.id}`); ❌ since redirect joins initial url with given; /authors + /authors/id
putting back slash infront -> new path, else relative path*/

// 📌 u can only make post,get req from a browser,for put,delete we need method-override lib
router.get('/:id', async (req, res) => {
  try {
    const author = await Author.findById(req.params.id)
    const books = await Book.find({ author: author.id })
    res.render('authors/show', {
      author: author,
      booksByAuthor: books
    })
  } catch(err){
    console.log(err)
    res.redirect('/')
  }
})

// 📌 url with /:id is dynamic ;
router.get('/:id/edit', requiresAuth() ,async (req, res) => {
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
  try{
    author = await Author.findById(req.params.id)
    author.name = req.body.name
    // console.log("up : ",author,' name : ',req.body.name)
    await author.save();
    res.redirect(`${author.id}`); 
    /* res.redirect(`authors/${author.id}`); ❌ since redirect joins initial url with given; /authors + /authors/id
    putting back slash infront -> new path, else relative path*/
  } catch{
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
      {author: author,booksByAuthor: books,errorMessage: 'Author has Linked books!'})
    }
  }
})

module.exports = router;
