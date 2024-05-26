import { Client } from 'discord.js';

/* TODO:
 * 1. 建立投票通過/不通過規則
 * 2. 有效投票時間長度
 * 3. 有效表情符號
 */

const client = new Client({ intents: ['Guilds', 'GuildMessages', 'GuildMessageReactions'] });
client.login(process.env.DISCORD_TOKEN);

export const sendReview = async (req, res) => {

  const channel = client.channels.cache.get(process.env.CHANNEL_ID);

  if (!channel) {
    return res.status(400).send('Channel not found');
  }

  await channel.send(`新增考古題 - ${req.file.originalname}: `+ req.fileURL).then(message => {
    // collect only these two emoji for voting.
    const filter = (reaction) => reaction.emoji.name === '👍' || reaction.emoji.name === '👎';
    const collector = message.createReactionCollector({ filter, time: 2147483647, dispose: true, max: 2147483647 });
    
    // handle new reactions
    collector.on('collect', (reaction, user) => {
      console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
    });
    
    // handle remove reactions
    collector.on('dispose', (reaction, user) => {
      console.log(`${user.tag} disposed their ${reaction.emoji.name}`);
    });
  })
  .catch(err => {
    res.status(500).send(`Failed to send message, error: ${err.message}`);
  });
  res.status(200).send('Uploaded to discord.');
}
