import { Client } from 'discord.js';
import { deleteFile } from '../drive/utils.js';

/* TODO:
 * 1. 顯示fileUploader, semester, courseTitle, professor
 * 2. 不通過檔案從ebg上刪除
 * 3. 設定threshold
 */

/*
 * BUG:
 * 1. 若collector不執行重啟,所有的message將一直被監聽,被放在RAM中,因無法單獨移除某些message的監聽
 */

const goodThreshold = 1;
const badThreshold = 1;
const ignoredMessages = [];


const deletePhysically = () => {
  // TODO: delete the file physically when the review doesn't pass.
}

const client = new Client({ intents: ['Guilds', 'GuildMessages', 'GuildMessageReactions'] });
client.login(process.env.DISCORD_TOKEN);

export const sendReview = async (req, res) => {

  const { fileId, fileURL } = req.body;
  // const { uploader, semester, courseTitle, professor } = req.body;

  const channel = client.channels.cache.get(process.env.CHANNEL_ID);

  if (!channel) {
    return res.status(400).send('Channel not found');
  }

  await channel.send(`新增考古題 - ${req.file.originalname}: `+ fileURL).then(message => {
    // collect only these two emoji for voting.
    const filter = (reaction) => reaction.emoji.name === '👍' || reaction.emoji.name === '👎';
    const collector = message.createReactionCollector({ filter, time: 2147483647, dispose: true, max: 2147483647 });
    
    // handle new reactions
    collector.on('collect', (reaction, user) => {

      // ignore messages in the ignoredMessages list.
      if (ignoredMessages.includes(reaction.message.id)) {
        return;
      }

      console.log(`Collected ${reaction.emoji.name} from ${user.tag} to ${reaction.message.id}`);
      if (reaction.emoji.name === '👍') {
        reaction.fetch().then(fetchedReaction => {
          // if the message passed the review.
          if (fetchedReaction.count >= goodThreshold) {
            console.log(`Message ${reaction.message.id} has passed the review, stop monitoring this message.`);
            ignoredMessages.push(reaction.message.id);

          }
        });
      } else if (reaction.emoji.name === '👎') {
        reaction.fetch().then(fetchedReaction => {
          // if the message doesn't pass the review.
          if (fetchedReaction.count >= badThreshold) {
            console.log(`Message ${reaction.message.id} doesn't pass the review.`);
            ignoredMessages.push(reaction.message.id);

            // delete the file on physical server.
            deletePhysically();
          }
        });
      }

      // delete file on google drive.
      deleteFile(fileId, (err) => {
        if (err) {
          console.error(err.message);
          reject(new Error('Failed to delete message on google drive.'));
        }
      })

    });
    
    // handle remove reactions
    collector.on('dispose', (reaction, user) => {
      
      // ignore messages in the ignoredMessages list.
      if (ignoredMessages.includes(reaction.message.id)) {
        return;
      }
      
      console.log(`${user.tag} disposed their ${reaction.emoji.name} to ${reaction.message.id}`);
    });
  })
  .catch(err => {
    res.status(500).send(`Failed to send message, error: ${err.message}`);
  });
  res.status(200).send('Uploaded to discord.');
}
