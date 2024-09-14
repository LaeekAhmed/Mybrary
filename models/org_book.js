//import
import mongoose from 'mongoose';

import path from 'path';
import Blob from 'node-blob';

// schema = table
const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  publish_date: {
    type: Date,
    required: true,
  },
  pageCount: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  Doc: {
    type: Buffer
  },
  DocType: {
    type : String
  },
  coverImage: {
    type: Buffer,
    required: true
  },
  coverImageType: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Author",
  },
});

bookSchema.virtual('DocPath').get(function() {
  // let blob = b64toBlob(this.Doc.toString("base64"),this.DocType);
  // let blobUrl = URL.createObjectURL(blob);
  let val = `data:${this.DocType};base64,${this.Doc.toString("base64")}`
  // openBase64InNewTab(val,this.DocType)
  if (val!=null){
    // console.log('val1 is not null')
    return val
  }
  else return ''
})


bookSchema.virtual('coverImagePath').get(function() {
  if (this.coverImage != null && this.coverImageType != null) {
    let val = `data:${this.coverImageType};charset=utf-8;base64,${this.coverImage.toString("base64")}`
    // let s1 = "iVBORw0KGgoAA"
    // let buf1 = new Buffer.from(s1, "base64");
    // let s2 = buf1.toString("base64")
    // console.log('s1==s2 : ',s1,s2)
    // console.log('data len : ',val.length)
    return val
  }
})


//export bookSchema as "Book";
export default mongoose.model("Book", bookSchema);
