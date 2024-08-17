import mongoose from 'mongoose';
import Book from './book.js';

// schema = table
const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
});

authorSchema.pre('remove', function (next) {
  Book.find({ author: this.id }, (err, books) => {
    // if mongoose can't connect to db
    if (err) {
      next(err)
    } else if (books.length > 0) {
      next(new Error('This author has books still'))
      // if no book is linked to the author
    } else {
      next()
    }
  })
})

//export authorSchema as "Author";
export default mongoose.model("Author", authorSchema);
