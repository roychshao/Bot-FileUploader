import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

// import routers
import uploadRouter from './routes/upload.js';

// import { InteractionType, InteractionResponseType } from 'discord-interactions';
// import { VerifyDiscordRequest, getRandomEmoji } from './discord/utils.js';
// import multer from 'multer';
// import { Client } from 'discord.js';

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

// routes
app.use("/api/upload", uploadRouter);

// const client = new Client({ intents: ['Guilds', 'GuildMessages'] });
//
// const upload = multer({ storage: multer.memoryStorage() });
// client.login(process.env.DISCORD_TOKEN);
//
// app.use(express.json( { verify: VerifyDiscordRequest() } ));

// app.post('/interactions', async function (req, res) {
//   const { type, data } = req.body;
//
//   /**
//    * Handle verification requests
//    */
//   if (type === InteractionType.PING) {
//     return res.send({ type: InteractionResponseType.PONG });
//   }
//
//   /**
//    * Handle slash command requests
//    */
//   if (type === InteractionType.APPLICATION_COMMAND) {
//     const { name } = data;
//
//     // "test" command
//     if (name === 'test') {
//       return res.send({
//         type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
//         data: {
//           content: 'hello world' + getRandomEmoji(),
//         },
//       });
//     }
//   }
// });

// app.post('/upload', upload.single('file'), async (req, res) => {
//
//   const channel = client.channels.cache.get(process.env.CHANNEL_ID);
//   if (!channel) {
//     return res.status(400).send('Channel not found');
//   }
//
//   channel.send({
//     files: [{
//       attachment: req.file.buffer,
//       name: req.file.originalname,
//     }],
//   }).then(() => {
//       res.status(200).send('File uploaded successfully');
//     }).catch(err => {
//       console.error(err);
//       res.status(500).send('An error occurred while uploading the file');
//     });
// })

app.get("/", (res) => {
  res.send("Hello world");
})

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
