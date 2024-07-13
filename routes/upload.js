import express from 'express';
import multer from 'multer';
import { scanFileSVC } from '../drive/utils.js';
import { uploadFileSVC } from '../drive/driveURL.js';
import { sendReview } from '../discord/client.js';

const router = express.Router();
const uploader = multer({ storage: multer.memoryStorage() });

router.post('/', uploader.array('files'), scanFileSVC, uploadFileSVC, sendReview);

export default router;
