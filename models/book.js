//import
import mongoose from 'mongoose';

import path from 'path';
import Blob from 'node-blob';

// schema = table
const DocSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  publish_date: { type: Date, default: Date.now },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  uuid: { type: String, required: true },
  file_name: { type: String, required: true },
  file_url: { type: String, required: true },
  author: { type: String, required: true },
  author_name: { type: String, required: true },
  // coverImage: {type: Buffer,required: true},
  // coverImageType: {type: String,required: true},
}, { timestamps: true });

// DocSchema.virtual('coverImagePath').get(function () {
//   if (this.coverImage != null && this.coverImageType != null) {
//     let val = `data:${this.coverImageType};charset=utf-8;base64,${this.coverImage.toString("base64")}`
//     return val
//   }
// })


//export DocSchema as "Doc/docs";
export default mongoose.model("Doc", DocSchema);