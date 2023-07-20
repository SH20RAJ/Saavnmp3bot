const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');

// Replace 'YOUR_TELEGRAM_BOT_TOKEN' with the token you provided
const botToken = '6190647327:AAFxS6-pwJldMaOtWmptqoFK9j5ABJd8KEs';

// Create a new instance of the Telegram bot
const bot = new TelegramBot(botToken, { polling: true });

async function searchSong(query) {
  const apiUrl = `https://saavn.me/search/songs?limit=5&query=${encodeURIComponent(query)}`;
  try {
    const response = await axios.get(apiUrl);
    const data = response.data;
    if (data.status === 'SUCCESS' && data.data && data.data.results.length > 0) {
      const results = data.data.results;
      return results.map((result) => {
        return {
          Song: result.name,
          Album: result.album.name,
          Year: result.year,
          Duration: convertDuration(result.duration),
          Label: result.label,
          Artists: result.primaryArtists,
          Language: result.language,
          Lyrics: result.hasLyrics === 'true' ? 'Available' : 'Not Available',
          URL: result.url,
          Image: result.image.find((img) => img.quality === '500x500').link,
          DownloadLinks: result.downloadUrl.map((download) => ({
            Quality: download.quality,
            Link: download.link,
          })),
        };
      });
    } else {
      return 'No results found.';
    }
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return 'An error occurred while fetching data.';
  }
}

function convertDuration(durationInSeconds) {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Event listener for incoming messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text.toLowerCase(); // Convert the message text to lowercase for easier handling

  // Check if the message contains the word "hi" and respond accordingly
  if (messageText.includes('hi')) {
    bot.sendMessage(chatId, 'Hi there! How can I assist you?');
  }

  // Check if the message contains a query and perform the song search
  const query = messageText.trim(); // Remove leading/trailing spaces from the message as the query
  try {
    const results = await searchSong(query);
    if (Array.isArray(results) && results.length > 0) {
      results.forEach((result) => {
        const responseText = `
Song Details:
Song: ${result.Song}
Album: ${result.Album}
Year: ${result.Year}
Duration: ${result.Duration}
Label: ${result.Label}
Artists: ${result.Artists}
Language: ${result.Language}
Lyrics: ${result.Lyrics}
URL: ${result.URL}
Download Links: ${result.DownloadLinks.map(
          (download) => `\n${download.Quality}: ${download.Link}`
        )}
        `;

        bot.sendPhoto(chatId, result.Image, { caption: responseText }).then(() => {
          const fileName = `${result.Song}.mp3`;
          axios({
            method: 'get',
            url: result.DownloadLinks[result.DownloadLinks.length - 1].Link, // Download the highest quality
            responseType: 'stream',
          }).then((response) => {
            response.data.pipe(fs.createWriteStream(fileName))
              .on('finish', () => {
                bot.sendDocument(chatId, fileName, { caption: 'Download Link' }).then(() => {
                  fs.unlinkSync(fileName); // Delete the temporary file after sending
                });
              })
              .on('error', (err) => {
                console.error('Error downloading file:', err.message);
                bot.sendMessage(chatId, 'An error occurred while downloading the file.');
              });
          });
        });
      });
    } else {
      bot.sendMessage(chatId, 'No results found.');
    }
  } catch (error) {
    console.error('Error searching for songs:', error.message);
    bot.sendMessage(chatId, 'An error occurred while searching for songs.');
  }
});
       
