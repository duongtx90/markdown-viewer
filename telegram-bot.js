require('dotenv').config()
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const UploadURL = process.env.UPLOAD_URL;
const ViewURL = process.env.VIEW_URL;
const telebot = require('telebot')
const fs = require('fs')
const bot = new telebot({
    token: TOKEN,

})

bot.on('document', async (msg) => {
    const { file_name, mime_type, file_id, file_unique_id, file_size } = msg.document
    if (file_size > 1024 * 1024 * 10) {
        bot.sendMessage(msg.chat.id, 'File is too large', {
            reply_to_message_id: msg.message_id,
            parse_mode: 'Markdown'
        })
        return
    }
    if (file_name.split('.').pop() !== 'md') {
        bot.sendMessage(msg.chat.id, 'Please send a markdown file', {
            reply_to_message_id: msg.message_id,
            parse_mode: 'Markdown'
        })
        return
    }
    const file = await bot.getFile(file_id)
    const file_link = file.fileLink;
    const response = await fetch(file_link)
    let mdContent = await response.text()

    // Upload markdown content to the pastebin service
    try {
        const uploadResponse = await fetch(UploadURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: mdContent
            })
        });

        if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            const documentId = result.id;
            const accessLink = `${ViewURL}${documentId}`;

            bot.sendMessage(msg.chat.id, `✅ Markdown file uploaded successfully!\n\n📄 ${file_name}\n🔗 Access link: ${accessLink}\n\n💡 You can view this document by visiting the link above.`, {
                reply_to_message_id: msg.message_id,
                parse_mode: 'Markdown'
            });
        } else {
            const error = await uploadResponse.json();
            bot.sendMessage(msg.chat.id, `❌ Failed to upload file: ${error.error || 'Unknown error'}`, {
                reply_to_message_id: msg.message_id,
                parse_mode: 'Markdown'
            });
        }
    } catch (error) {
        console.error('Error uploading to pastebin:', error);
        bot.sendMessage(msg.chat.id, '❌ Failed to upload file due to a network error. Please try again.', {
            reply_to_message_id: msg.message_id,
            parse_mode: 'Markdown'
        });
    }
})


bot.start()