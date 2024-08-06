# Bot - FileUploader
---
> An ExpressJs application which has an RESTful api to receive files, scan, review and store.

### Process
1. check file types, if not passed, return directly.
2. if more than one file, compress it to be a zip file
1. scan the file for security concerns  
2. save the file in the /drive/passedFiles
3. upload it to google drive (service account) 
3. send the file URL to discord and monitoring the voting condition of the file  
4. if the file doesn't pass the review or scan, move it to /drive/failedFiles

### API

(The api accept only one file within a request, and only PDF,PNG,HEIC,JPG files are accepted.)

* Endpoint: POST https://hostname/api/upload
* Content-Type: multipart/form-data
* Data needed:

```
req.body: {
    files: [<file>],
    zipName: string, // need this field when files.length > 1 or text field is not empty
    uploader: string,
    semester: string,
    courseTitle: string,
    professor: string,
    text: string,
}
```

* Accepted mimetype: .pdf, .png, .jpg/jpeg, .heic (will be converted to .jpg)

### Start
clone this repository
```zsh
git clone https://github.com/roychshao/Bot-FileUploader.git
```

you have to have .env file in the root directory
```
APP_ID=*****
DISCORD_TOKEN=*****
PUBLIC_KEY=*****
CHANNEL_ID=*****
VIRUSTOTAL_API_KEY=*****
PORT=3000
```

secret-key file for google drive api
```
serviceAccount-secret-key.json
```

npm install and run
```zsh
npm install
npx api install "@gtidocs/v1.0#4whvluqxhpj8"
npm run dev
```
