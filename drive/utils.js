import { google } from 'googleapis';
import streamifier from 'streamifier';
import key from './../serviceAccount-secret-key.json' assert { type: 'json' };
import NodeClam from 'clamscan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";
import util from 'util';

/*
 * Clamscan scan file for security issue
 */
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
mkdir('clamscan').catch(() => {});
mkdir('clamscan/infected').catch(() => {});
writeFile('scan.log', '').catch(() => {});

// Build on init
const ClamScan = new NodeClam().init({
  remove_infected: true,
  quarantineInfected: './clamscan/infected/',
  scanLog: './clamscan/scan.log',
  debugMode: true,
});

const checkFileType = async (req) => {
  return new Promise((resolve, reject) => {
    if (req.file.mimetype !== 'application/pdf' &&
      req.file.mimetype !== 'image/png' &&
      req.file.mimetype !== 'image/jpeg') {
      console.error('unsupported file type:', req.file.mimetype);
      reject(new Error('unsupported file type.'));
    } else {
      resolve();
    }
  })
}

const scanFile = async (req) => {
  return new Promise( async (resolve, reject) => {

    // check file type
    await checkFileType(req).catch(err => {
      reject(err);
      throw err;
    }).then(() => {

      try {
        const file = req.file;
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const tempFilePath = path.join(__dirname, file.originalname);

        // create temporary file
        fs.writeFile(tempFilePath, file.buffer, async (err) => {

          if (err) {
            reject(err);
          }

          fs.chmod(tempFilePath, 777, (err) => {

            if (err) {
              reject(err);
            }
          })

          // scan the file
          await ClamScan.then( async clamscan => {
            clamscan.scanFile(tempFilePath, async (err, safe) => {

              // delete the temporary file
              fs.unlinkSync(tempFilePath, (err) => {
                if (err) {
                  reject(err);
                }
              })
              if (err) {
                console.error("Error scanning file:", err);
                reject(new Error('scan failed.'));
              } else if (!safe) {
                console.log("File is infected");
                reject(new Error('file infected.'));
              } else {
                resolve();
              }
            });
          })
        })
      } catch (err) {
        console.error(err.message);
        reject(err);
      }
    }).catch(err => {
      reject(err);
    })
  })
}



/*
 * Google Drive upload files
 */
const drive = google.drive('v3');

const jwtClient = new google.auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ['https://www.googleapis.com/auth/drive'],
);

const uploadFile = async (req) => {
  return new Promise((resolve, reject) => {

    // authorize the jwtClient
    jwtClient.authorize((err) => {
      if (err) {
        reject(err);
        return;
      }


      const fileMetadata = {
        name: req.file.originalname,
      };

      const media = {
        mimeType: req.file.mimetype,
        body: streamifier.createReadStream(req.file.buffer),
      };

      // create file on google drive
      drive.files.create({
        auth: jwtClient,
        resource: fileMetadata,
        media: media,
        fields: 'id',
      }, (err, file) => {
          if (err) {
            reject(err);
          } 
          else {
            const fileURL = `https://drive.google.com/uc?id=${file.data.id}`;
            console.log("File Name: ", req.file.originalname);
            console.log('File Id: ', file.data.id);
            console.log("File URL: ", fileURL);

            // modify the file permission for everyone can read
            drive.permissions.create({
              auth: jwtClient,
              fileId: file.data.id,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
            }, (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve({ fileId: file.data.id, fileURL: fileURL });
                }
              })
          }
        })
    });
  })
}

export const downloadFile = () => {
  // TODO:
  // download file from google drive with specific fileId.
}

export const deleteFile = (fileId, callback) => {
  drive.files.delete({
    auth: jwtClient,
    fileId: fileId
  }, (err) => {
      if (err) {
        callback(err);
      }
      callback();
    })
}

export const scanFileSVC = async (req, res, next) => {
  await scanFile(req).then(() => {
    next();
  })
  .catch(err => {
    if (err.message === 'unsupported file type.') {
      res.status(403).send('unsupported file type, only PDF, PNG and JPG are allowed.');
    } else if (err.message === 'scan failed.') {
      res.status(500).send({ error: err.message });
    } else if (err.message === 'file infected.') {
      res.status(403).send('malware/virus are scanned, the request is denied.');
    } else {
      res.status(500).send(err.message);
    }
  })
}

export const uploadFileSVC = async (req, res, next) => {
  await uploadFile(req).then((addons) => {
    req.body.fileId = addons.fileId;
    req.body.fileURL = addons.fileURL;
    next();
  }).catch(err => {
    res.status(500).send({ error: err.message });
  })
}
