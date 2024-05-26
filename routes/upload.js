import express from 'express';
import multer from 'multer';
import { uploadFileSVC } from '../drive/utils.js';
import { sendReview } from '../discord/client.js';

const router = express.Router();
const uploader = multer({ storage: multer.memoryStorage() });

router.post('/', uploader.single('file'), uploadFileSVC, sendReview);

export default router;
