const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const botToken = '6590974706:AAGzBB68M4RpBPYs7HHPZAPtRQxqG7cn8Hs';
const channelUsername = '@Midjourneyai1';

async function getChannelMedia() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${channelUsername}`);
        const data = await response.json();
        
        if (data.ok && data.result) {
            const channel = data.result;
            const chatId = channel.id;
            
            const mediaResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChatHistory?chat_id=${chatId}`);
            const mediaData = await mediaResponse.json();
            
            if (mediaData.ok && mediaData.result && mediaData.result.messages) {
                const messages = mediaData.result.messages;
                
                const mediaUrls = [];
                
                for (const message of messages) {
                    if (message.media && message.media.type === 'photo') {
                        const photo = message.media.photo;
                        const fileId = photo[photo.length - 1].file_id;
                        
                        const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
                        const fileData = await fileResponse.json();
                        
                        if (fileData.ok && fileData.result && fileData.result.file_path) {
                            const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
                            mediaUrls.push(fileUrl);
                        }
                    }
                }
                
                return mediaUrls;
            }
        }
        
        throw new Error('Unable to fetch media from the channel.');
    } catch (error) {
        console.error('An error occurred:', error.message);
    }
}

async function downloadMedia(mediaUrls) {
    try {
        const mediaFolder = './media';
        await fs.mkdir(mediaFolder, { recursive: true });

        for (let i = 0; i < mediaUrls.length; i++) {
            const mediaUrl = mediaUrls[i];
            const response = await fetch(mediaUrl);
            const mediaBuffer = await response.buffer();
            
            const filePath = `${mediaFolder}/media_${i + 1}.jpg`;
            await fs.writeFile(filePath, mediaBuffer);
            
            console.log(`Downloaded media ${i + 1}`);
        }
        
        console.log('Media download completed.');
    } catch (error) {
        console.error('An error occurred:', error.message);
    }
}

async function main() {
    const mediaUrls = await getChannelMedia();
    if (mediaUrls && mediaUrls.length > 0) {
        await downloadMedia(mediaUrls);
    } else {
        console.log('No media found in the channel.');
    }
}

main();