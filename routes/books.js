import express from 'express';
const router = express.Router();

import path from 'path';
import multer from 'multer';
import { s3 } from '../index.js';
import Doc from '../models/book.js';
import { v4 as uuidv4 } from 'uuid';
import { readFile } from 'node:fs/promises';
import { Upload } from '@aws-sdk/lib-storage';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { clerkClient, ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

// Get all books route
router.get("/", async (req, res) => {
   try {
      let query = Doc.find().select('-coverImage -coverImageType'); // Exclude coverImage and coverImageType fields

      // handlesearch query params
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

      res.json({
         success: true,
         data: books,
         searchOptions: req.query
      });
   } catch (e) {
      console.log("error", e);
      res.status(500).json({
         success: false,
         message: "An error has occurred",
      });
   }
});

router.post('/', ClerkExpressRequireAuth(), (req, res) => {
   // func to create file and place it in the dest folder.
   let storage = multer.diskStorage({
      filename: (req, file, cb) => {
         const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
         cb(null, uniqueName)
      },
   });

   // 100mb size limit ;
   let upload = multer({ storage, limits: { fileSize: 1000000 * 100, fieldSize: 2 * 1024 * 1024 }, }).single('userFile');
   upload(req, res, async (err) => {
      console.log("request body:", JSON.stringify(req.body, null, 2));

      // validate request
      if (!req.file) {
         console.log('no file uploaded')
         return res.status(400).json({ error: 'All fields are required!' })
      }
      if (err) {
         console.log('err = ', err + ' , try to use a image with size <= 500 kb ')
         return res.status(500).json({ error: err.message + ', try to use a image with size <= 500 kb ' });
      }
      console.log('\nfile name = ', req.file.filename)

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
      console.log('uploaded to bucket:', uploadedFile.Location)

      const req_user = await clerkClient.users.getUser(req.auth.userId);

      // save entry in db
      const book = new Doc({
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
         res.status(201).json({
            success: true,
            message: 'Book created successfully',
            data: newBook
         });
      } catch (error) {
         // remove file from bucket if error occurs
         const s3_params = { Bucket: 'note-spot', Key: req.file.filename };
         try {
            const command = new DeleteObjectCommand(s3_params);
            await s3.send(command);
            console.log('file deleted from bucket while creating doc');
         } catch (deleteError) {
            console.log('unabled to delete file from bucket while creating doc: ', deleteError);
         }

         res.status(500).json({
            success: false,
            message: 'Error creating book',
            error: error.message
         });
      }
   });
});

router.get('/:id', async (req, res) => {
   try {
      const book = await Doc.findById(req.params.id)
      if (!book) {
         return res.status(404).json({
            success: false,
            message: 'Book not found'
         });
      }
      res.status(200).json({
         success: true,
         data: book
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: 'Error retrieving book',
         error: error.message
      });
   }
})

router.delete("/:id", async (req, res) => {
   try {
      const book = await Doc.findById(req.params.id);
      if (!book) {
         return res.status(404).json({
            success: false,
            message: 'Book not found'
         });
      }

      // removing file from bucket
      const params = { Bucket: 'note-spot', Key: book.file_name };
      const command = new DeleteObjectCommand(params);
      await s3.send(command);
      console.log('File deleted from bucket');

      // removing book from db
      await Doc.findByIdAndDelete(req.params.id);

      res.status(200).json({
         success: true,
         message: 'Book deleted successfully'
      });

   } catch (error) {
      console.error('Error deleting book:', error);
      res.status(500).json({
         success: false,
         message: 'Error deleting book',
         error: error.message
      });
   }
});

export default router;