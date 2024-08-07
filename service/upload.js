import { uploadFile } from '../drive/driveURL.js';

export const uploadFileSVC = async (req, res, next) => {
  await uploadFile(req).then((addons) => {
    req.body.fileId = addons.fileId;
    req.body.fileURL = addons.fileURL;
    next();
  }).catch(err => {
    res.status(500).send({ error: err.message });
  })
}
