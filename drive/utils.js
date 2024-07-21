import NodeClam from 'clamscan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import util from 'util';
import convert from 'heic-convert';
import archiver from 'archiver';

/*
 * Clamscan scan file for security issue
 */
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
mkdir('clamscan').catch(() => {});
mkdir('clamscan/infected').catch(() => {});
mkdir('drive/passedFiles').catch(() => {});
mkdir('drive/failedFiles').catch(() => {});
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
    req.files.forEach( async file => {
      if (file.mimetype !== 'application/pdf' &&
        file.mimetype !== 'image/png' &&
        file.mimetype !== 'image/jpeg' &&
        file.mimetype !== 'image/heic') {
        console.error('unsupported file type:', file.mimetype);
        reject(new Error('unsupported file type, only PDF, PNG, HEIC and JPG are allowed.'));
      } else {
        // exception case for heic format file
        if (file.mimetype === 'image/heic') {
          const inputBuffer = file.buffer;
          const outputBuffer = await convert({
            buffer: inputBuffer,
            format: 'JPEG',
          });
          file.buffer = outputBuffer;
          file.mimetype = 'image/jpeg';
          file.originalname = file.originalname.replace(/\.heic$/i, '.jpg');
        }
        resolve();
      }
    })
  })
}

const scanFile = async (req) => {
  return new Promise( async (resolve, reject) => {

    try {
      const file = req.file;
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      // TODO: categorize path by semester, courseTitle, professor
      const tempFilePath = path.join(__dirname, 'passedFiles', new Date().toISOString() + '-' + file.originalname);

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
              deletePhysicalFile(tempFilePath, file.originalname, (err) => {
                if (err) {
                  console.error("Delete Physical File Error:", err);
                }
              });
              reject(new Error('scan failed.'));
            } else if (!safe) {
              console.log("File is infected");
              deletePhysicalFile(tempFilePath, file.originalname, (err) => {
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
  })
}


const compressFiles = async (req) => {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    req.files.forEach(file => {
      if (file) {
        archive.append(file.buffer, { name: file.originalname });
      }
    })

    let buffers = [];
    archive.on('data', buffer => {
      buffers.push(buffer)
    });

    archive.on('error', (e) => {
      reject(e);
    })

    archive.on('end', () => {
      req.file = {
        buffer: null,
        originalname: "",
        mimetype: "",
      }
      req.file.buffer = Buffer.concat(buffers);
      req.file.originalname = req.body.zipName;
      req.file.mimetype = "application/zip";
      resolve();
    })

    archive.finalize();
  })
}

// delete physical file
export const deletePhysicalFile = (filePath, fileName ,callback) => {
  console.log('file move to: ' + filePath + './failedFiles/' + fileName);
  fs.rename(filePath, './failedFiles/' + fileName, (err) => {
    if (err) {
      callback(err);
    }
    callback();
  })
}


export const scanFileSVC = async (req, res, next) => {

  await checkFileType(req).then( async () => {

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
      next();
    })
    .catch(err => {
      if (err.message === 'scan failed.') {
        throw {
          status: 500,
          message: 'scan failed: ' + err.message
        }
      } else if (err.message === 'file infected.') {
        throw {
          status: 403,
          message: 'malware/virus are scanned, the request is denied.'
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
