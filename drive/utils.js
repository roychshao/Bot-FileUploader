import NodeClam from 'clamscan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import util, { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import convert from 'heic-convert';

/*
 * Clamscan scan file for security issue
 */
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
mkdir('clamscan').catch(() => {});
mkdir('clamscan/infected').catch(() => {});
mkdir('drive/receivedFiles').catch(() => {});
writeFile('scan.log', '').catch(() => {});

// Build on init
const ClamScan = new NodeClam().init({
  remove_infected: true,
  quarantineInfected: './clamscan/infected/',
  scanLog: './clamscan/scan.log',
  debugMode: true,
});

const checkFileType = async (req) => {
  return new Promise( async (resolve, reject) => {
    if (req.file.mimetype !== 'application/pdf' &&
      req.file.mimetype !== 'image/png' &&
      req.file.mimetype !== 'image/jpeg' &&
      req.file.mimetype !== 'image/heic') {
      console.error('unsupported file type:', req.file.mimetype);
      reject(new Error('unsupported file type.'));
    } else {
      // exception case for heic format file
      if (req.file.mimetype === 'image/heic') {
        const inputBuffer = req.file.buffer;
        const outputBuffer = await convert({
          buffer: inputBuffer,
          format: 'JPEG',
        });
        req.file.buffer = outputBuffer;
        req.file.mimetype = 'image/jpeg';
        req.file.originalname = req.file.originalname.replace(/\.heic$/i, '.jpg');
      }
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
        // TODO: categorize path by semester, courseTitle, professor
        const tempFilePath = path.join(__dirname, 'receivedFiles', uuidv4() + '-' + file.originalname);
 
        // create physical file
        fs.writeFile(tempFilePath, file.buffer, async (err) => {
          if (err) {
            reject(err);
          }
          fs.chmod(tempFilePath, 770, (err) => {

            if (err) {
              reject(err);
            }
          })

          // scan the file
          await ClamScan.then( async clamscan => {
            clamscan.scanFile(tempFilePath, async (err, safe) => {

              if (err) {
                console.error("Error scanning file:", err);
                deletePhysicalFile(tempFilePath, (err) => {
                  if (err) {
                    console.error("Delete Physical File Error:", err);
                  }
                });
                reject(new Error('scan failed.'));
              } else if (!safe) {
                console.log("File is infected");
                deletePhysicalFile(tempFilePath, (err) => {
                  if (err) {
                    console.error("Delete Physical File Error:", err);
                  }
                });
                reject(new Error('file infected.'));
              } else {
                resolve({ filePath: tempFilePath });
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


// delete physical file
export const deletePhysicalFile = (filePath, callback) => {
  fs.rm(filePath, (err) => {
    if (err) {
      callback(err);
    }
    callback();
  });
}


export const scanFileSVC = async (req, res, next) => {
  await scanFile(req).then((addons) => {
    req.body.filePath = addons.filePath;
    next();
  })
  .catch(err => {
    if (err.message === 'unsupported file type.') {
      res.status(403).send('unsupported file type, only PDF, PNG, HEIC and JPG are allowed.');
    } else if (err.message === 'scan failed.') {
      res.status(500).send({ error: err.message });
    } else if (err.message === 'file infected.') {
      res.status(403).send('malware/virus are scanned, the request is denied.');
    } else {
      res.status(500).send(err.message);
    }
  })
}
