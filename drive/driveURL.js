import { google } from 'googleapis';
import streamifier from 'streamifier';
import key from './../serviceAccount-secret-key.json' assert { type: 'json' };

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

export const deleteDriveFile = (fileId, callback) => {
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

export const uploadFileSVC = async (req, res, next) => {
  await uploadFile(req).then((addons) => {
    req.body.fileId = addons.fileId;
    req.body.fileURL = addons.fileURL;
    next();
  }).catch(err => {
    res.status(500).send({ error: err.message });
  })
}
