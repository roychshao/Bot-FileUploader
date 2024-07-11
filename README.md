# Bot - FileUploader
---
> An ExpressJs application which has an RESTful api to receive files, scan, review and store.

### Process
1. scan the file for security concerns  
2. save the file in the server
3. upload it to google drive (service account) 
3. send the file URL to discord and monitoring the voting condition of the file  
4. if the file doesn't pass the review, deleting it from the server
5. open an RESTful API

* files stored in ./drive/receivedFiles/

### API

(The api accept only one file within a request, and only PDF,PNG,JPG files are accepted.)

* Endpoint: POST https://hostname/api/upload
* Content-Type: multipart/form-data
* Data needed:
```
req.body: {
    file: <file>,
    uploader: string,
    semester: string,
    courseTitle: string,
    professor: string
}
```
* Accepted mimetype: .pdf, .png, .jpg/jpeg

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
PORT=3000
```

secret-key file for google drive api
```
serviceAccount-secret-key.json
```

install clamav and clamav-daemon
```zsh
sudo apt-get update
sudo apt-get install clamav clamav-daemon
```

start clamav-freshclam
```zsh
sudo service clamav-freshclam restart
sudo service clamav-freshclam status
```

start clamav-daemon
```zsh
sudo service clamav-daemon start
sudo service clamav-daemon status
```

npm install and run
```zsh
npm install
npm run dev
```
