# Bot - FileUploader
---
> An ExpressJs application which has an RESTful api to receive files, scan, review and store.

### Process
1. scan the file for security concerns  
2. upload it to google drive (service account)  
3. send the file URL to discord and monitoring the voting condition of the file  
4. if the file pass the review, store it into the database of ourselves, and frontend can get the files with RESTful api.

### API

(The api accept only one file within a request, and only PDF,PNG,JPG files are accepted.)

* Endpoint: POST https://<hostname>/api/upload
* Content-Type: multipart/form-data
* Data needed:
```json
req.body: {
    file: <file>  
}
```
* Accepted mimetype: .pdf, .png, .jpg

### Start
clone this repository
```zsh
git clone https://github.com/roychshao/Bot-FileUploader.git
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
