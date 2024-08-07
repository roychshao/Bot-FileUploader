import path from 'path';
import fs from 'fs';
import util from 'util';
import convert from 'heic-convert';
import archiver from 'archiver';
import gtidocs from '@api/gtidocs';

/*
 * create success/failed directory to store files.
 */
const mkdir = util.promisify(fs.mkdir);
mkdir('passedFiles').catch(() => { });
mkdir('failedFiles').catch(() => { });

export const checkFileType = async (req) => {
  return new Promise(async (resolve, reject) => {
    req.files.forEach(async file => {
      if (file.mimetype !== 'application/pdf' &&
        file.mimetype !== 'image/png' &&
        file.mimetype !== 'image/jpeg' &&
        file.mimetype !== 'image/heic') {
        console.error('unsupported file type:', file.mimetype);
        reject({ status: 500, message: 'unsupported file type, only PDF, PNG, HEIC and JPG are allowed.' });
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

/*
 * scan the zip file and create physical file simultaneuosly
 */
export const scanFile = async (req) => {
  return new Promise(async (resolve, reject) => {

    const file = req.file;
    // TODO: categorize path by semester, courseTitle, professor
    const compressedFileName = new Date().toISOString() + '-' + file.originalname;
    const tempFilePath = path.join('passedFiles', compressedFileName);

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

      // send file to virustotal for scanning file.
      gtidocs.auth('x-apikey');
      await gtidocs.postFiles({ file: tempFilePath }, {
        'x-apikey': process.env.VIRUSTOTAL_API_KEY
      }).then(async (data) => {
        const id = data.data.data.id;
        let status = '';
        let stats = {};
        // polling every 10 seconds
        while (status !== 'completed') {
          const wait = (ms) => {
            return new Promise(resolve => setTimeout(() => resolve(), ms));
          };
          await wait(10000);
          await gtidocs.analysis({ id: id, 'x-apikey': process.env.VIRUSTOTAL_API_KEY }).then((data) => {
            status = data.data.data.attributes.status;
            stats = data.data.data.attributes.stats;
            console.log("virustotal queueing... (10 sec a try)");
          }).catch((err) => {
            console.error("Error during analysis polling:", err);
          });
        }
        console.log(stats);
        if (stats.malicious === 0 &&
          stats.suspicious === 0) {
          console.log("VirusTotal: harmless.");
          resolve({ filePath: tempFilePath, compressedFileName: compressedFileName });
        } else {
          throw new Error('file infected.');
        }
      }).catch((err) => {
        console.log(err);
        deletePhysicalFile(tempFilePath, compressedFileName, (err) => {
          if (err) {
            console.error(err);
          } else {
            console.log("file moved to failed area.");
          }
        })
        reject(err);
      })
    })
  })
}

/*
 * compress multiple files in req.files and write the zip file in req.file
 */
export const compressFiles = async (req) => {
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

/*
 * delete physical file
 */
export const deletePhysicalFile = (filePath, fileName, callback) => {
  fs.rename(filePath, './failedFiles/' + fileName, (err) => {
    if (err) {
      callback(err);
    }
    callback();
  })
}
