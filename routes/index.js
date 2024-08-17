import express from 'express';
const router = express.Router()
import Book from '../models/book.js';

// without caching :
router.get('/', async (req, res) => {
  let books
  try {
    books = await Book.find().sort({ createdAt: 'desc' }).limit(10).exec()
  } catch {
    books = []
  }
  res.render('index', { books: books })
  // res.render('test')
})

// router.get('/user', requiresAuth() ,async (req, res) => {
//   res.render('user')
// })

export default router;

// server side caching ;
// console.log(process.env.REDISCLOUD_URL)
// const redisClient = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

// (async () => {
//   await redisClient.connect();
// })();

// redisClient.on('connect', () => console.log('::> Redis Client Connected'));
// redisClient.on('error', (err) => console.log('<:: Redis Client Error', err));

// router.get('/', async (req, res) => {
//   redisClient.get('book2').then( async (book2) => {
//     if(book2 != null){
//       // console.log('try1: ',book2)
//       let val = JSON.parse(book2)
//       // console.log('try2 : ',Buffer.from(val[1].coverImage))
//       // val[1].coverImage = Buffer.from(val[1].coverImage)
//       res.render('index', { books: val })
//     } else {
//       let books
//       try {
//         books = await Book.find().sort({ createdAt: 'desc' }).limit(10).exec()
//       } catch {
//         books = []
//       }
//       redisClient.setEx("book2",3600,JSON.stringify(books))
//       console.log('redis updated')
//       res.render('index', { books: books })
//     }
//   })

// })