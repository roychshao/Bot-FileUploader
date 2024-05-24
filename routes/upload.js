import express from 'express';
import multer from 'multer';
import { uploadFile } from '../drive/utils.js';

const router = express.Router();
const uploader = multer({ storage: multer.memoryStorage() });

router.post('/', uploader.single('file'), uploadFile);

export default router;
