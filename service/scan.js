import { checkFileType, compressFiles, scanFile } from '../utils/utils.js'


export const scanFileSVC = async (req, res, next) => {

  await checkFileType(req).then(async () => {

    // if some text is given, add a txt file into zip
    if (req.body.text) {
      let buffer = Buffer.from(req.body.text, 'utf-8');
      let file = {
        buffer: buffer,
        originalname: 'manual.txt',
        mimetype: 'text/plain'
      };
      req.files.push(file);
    }

    // if there are more than one files, compress it.
    if (req.files.length > 1) {
      if (req.body.zipName === undefined) {
        throw {
          status: 400,
          message: 'zipName argument is missing.'
        };
      } else {
        await compressFiles(req).catch(err => {
          throw {
            status: 500,
            message: 'compress failed: ' + err.message
          };
        });
        req.files = null;
      }
    } else {
      req.file = req.files[0];
      req.files = null;
    }

    // scan file
    await scanFile(req).then((addons) => {
      req.body.filePath = addons.filePath;
      req.body.compressedFileName = addons.compressedFileName;
      next();
    })
      .catch(err => {
        if (err.message === 'file infected.') {
          throw {
            status: 403,
            message: 'malicious/suspicious are scanned, the request is denied.'
          };
        } else {
          throw {
            status: 500,
            message: err.message
          };
        }
      })

  }).catch((err) => {
    res.status(err.status).send({
      success: false,
      message: err.message
    });
  })
}
