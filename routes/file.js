const router = require('express').Router();
import multer from 'multer';
import path from 'path';
import File from '../models/file.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'; // filesys -> to delete book covers created while no new entry for book was created due to error

let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName)
    },
});

let upload = multer({ storage, limits: { fileSize: 1000000 * 100 }, }).single('myfile'); //100mb

router.get('/', (req, res) => {
    res.render('files/temp')
});

router.post('/', (req, res) => {
    //storing file 
    upload(req, res, async (err) => {
        // validate request
        if (!req.file) {
            return res.json({ error: 'All fields are required!' })
        }
        if (err) {
            return res.status(500).send({ error: err.message });
        }
        console.log('file = ', req.file.filename)
        // storing new entry in collection 'files'
        const file = new File({
            filename: req.file.filename,
            uuid: uuidv4(),
            path: req.file.path,
            size: req.file.size
        });
        const response = await file.save();
        res.redirect(`${process.env.APP_BASE_URL}/files/${response.uuid}`); // file.uuid
        // eg : http://localhost:3000/files/345h5465h-3245tkgndj
    });
});

router.get('/download/:uuid', async (req, res) => {
    // Extract link and get file from storage send download stream 
    const file = await File.findOne({ uuid: req.params.uuid });
    // Link expired
    if (!file) {
        return res.render('files/download', { error: 'Link has been expired.' });
    }
    const response = await file.save();
    const filePath = `${__dirname}/../${file.path}`;
    // res.download(filePath);
    fs.readFile(filePath, function (err, data) {
        res.contentType("application/pdf");
        res.send(data);
    });
});

router.get('/:uuid', async (req, res) => {
    try {
        const file = await File.findOne({ uuid: req.params.uuid });
        // Link expired
        if (!file) {
            return res.render('files/download', { errorMessage: 'Link has been expired.' });
        }
        return res.render('files/download', { uuid: file.uuid, fileName: file.filename, fileSize: file.size, path: file.path, downloadLink: `${process.env.APP_BASE_URL}/files/download/${file.uuid}` });
    } catch (err) {
        return res.render('files/download', { errorMessage: 'Something went wrong.' });
    }
});



export default router;