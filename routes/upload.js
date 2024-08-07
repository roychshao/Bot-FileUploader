import express from 'express';
import multer from 'multer';
import { scanFileSVC } from '../service/scan.js';
import { uploadFileSVC } from '../service/upload.js';
import { sendReview } from '../discord/client.js';

const router = express.Router();
const uploader = multer({ storage: multer.memoryStorage() });

router.post('/', uploader.array('files'), scanFileSVC, uploadFileSVC, sendReview);

export default router;
