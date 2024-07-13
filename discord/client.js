import { Client } from 'discord.js';
import { deleteDriveFile } from '../drive/driveURL.js';
import { deletePhysicalFile } from '../drive/utils.js';

/* TODO:
 * 1. 顯示fileUploader, semester, courseTitle, professor
 * 2. threshold policy
 */

const goodThreshold = 2;
const badThreshold = 1;

const client = new Client({ intents: ['Guilds', 'GuildMessages', 'GuildMessageReactions'] });
client.login(process.env.DISCORD_TOKEN);

export const sendReview = async (req, res) => {

  const { fileId, fileURL, filePath } = req.body;
  // const { uploader, semester, courseTitle, professor } = req.body;

  const channel = client.channels.cache.get(process.env.CHANNEL_ID);

  if (!channel) {
    return res.status(400).send('Channel not found');
  }

  await channel.send(`新增考古題 - ${req.file.originalname}: `+ fileURL).then(message => {
    // collect only these two emoji for voting.
    const filter = (reaction) => reaction.emoji.name === '👍' || reaction.emoji.name === '👎';
    let collector = message.createReactionCollector({ filter, time: 2147483647, dispose: true, max: 2147483647 });
    let hasResult = false;

    // handle new reactions
    collector.on('collect', (reaction, user) => {

      console.log(`Collected ${reaction.emoji.name} from ${user.tag} to ${reaction.message.id}`);
      if (reaction.emoji.name === '👍') {
        reaction.fetch().then(fetchedReaction => {
          
          // if the message passed the review.
          if (fetchedReaction.count >= goodThreshold) {
            console.log(`Message ${reaction.message.id} has passed the review, stop monitoring this message.`);
            hasResult = true;
          }

        });
      } else if (reaction.emoji.name === '👎') {
        reaction.fetch().then(fetchedReaction => {
          // if the message doesn't pass the review.
          if (fetchedReaction.count >= badThreshold) {
            console.log(`Message ${reaction.message.id} doesn't pass the review.`);
            hasResult = true;

            // delete the file on physical server. 
            deletePhysicalFile(filePath, (err) => {
              if (err) {
                console.error("Delete Physical File Error:", err);
              }
            });
          }
        });
      }

      if (hasResult) {
        // destroy collector
        collector.stop();
        collector = null;
        
        // delete file on google drive.
        deleteDriveFile(fileId, (err) => {
          if (err) {
            console.error(err.message);
            res.status(500).send(`Failed to delete file on google drive, error: ${err.message}`)
          }
        })
      } 
    });
     
    // handle remove reactions
    collector.on('dispose', (reaction, user) => { 
      console.log(`${user.tag} disposed their ${reaction.emoji.name} to ${reaction.message.id}`);
    });
  })
  .catch(err => {
    res.status(500).send(`Failed to send message, error: ${err.message}`);
  });
  res.status(200).send('Uploaded to discord.');
}
