import { google } from 'googleapis';
import streamifier from 'streamifier';
import key from './../serviceAccount-secret-key.json' assert { type: 'json' };

const drive = google.drive('v3');

const jwtClient = new google.auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ['https://www.googleapis.com/auth/drive'],
);


export const uploadFile = async (req, res, next) => {
  // authorize the jwtClient
  jwtClient.authorize((err, tokens) => {
    if (err) {
      console.error(err);
      return;
    }

    const fileMetadata = {
      name: req.file.originalname,
    };

    const media = {
      mimeType: req.file.mimeType,
      body: streamifier.createReadStream(req.file.buffer),
    };

    drive.files.create({
      auth: jwtClient,
      resource: fileMetadata,
      media: media,
      fields: 'id',
    }, (err, file) => {
      if (err) {
          console.error(err);
      } else {
        console.log('File Id: ', file.data.id);
        const fileUrl = `https://drive.google.com/uc?id=${file.data.id}`;
        console.log("File URL: ", fileUrl);

        drive.permissions.create({
          auth: jwtClient,
          fileId: file.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        }, (err) => {
          if (err) {
            console.error(err);
          }
        })
      }
    })
  });
  next();
}
