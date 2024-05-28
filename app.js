import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";
import { VerifyDiscordRequest } from './discord/utils.js';

// import routers
import uploadRouter from './routes/upload.js';

const app = express();
const PORT = process.env.PORT || 3000;

// morgan
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
var accessLogStream = fs.createWriteStream(path.join(__dirname, "access.log"), {
  flags: "a",
});
app.use(morgan("combined", { stream: accessLogStream }));

// helmet
app.use(helmet());

// discord verification
app.use(express.json( { verify: VerifyDiscordRequest() } ));

// routes
app.use("/api/upload", uploadRouter);

app.get("/", (res) => {
  res.send("Hello world");
})

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
