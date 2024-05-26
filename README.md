# Bot - FileUploader
---
> An ExpressJs application which has an RESTful api to receive files, scan, review and store.

### Process
1. scan the file for security concerns  
2. upload it to google drive (service account)  
3. send the file URL to discord and monitoring the voting condition of the file  
4. if the file pass the review, store it into the database of ourselves, and frontend can get the files with RESTful api. 
