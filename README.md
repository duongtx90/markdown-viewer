# Markdown Viewer

A simple and powerful markdown sharing service that allows you to create, share, and view markdown documents with optional password protection and expiration dates.

🌐 **Live Service:** [md.brew.monster](https://md.brew.monster)  
🤖 **Telegram Bot:** [@mdview_bot](https://t.me/mdview_bot)

## Features

- 📝 **Create & Share** - Upload markdown content and get shareable links
- 🔒 **Password Protection** - Secure your documents with passwords
- ⏰ **Auto Expiration** - Set documents to expire after 1 hour, 1 day, or 1 week
- 🎯 **Custom IDs** - Use custom identifiers for your documents
- 🤖 **Telegram Integration** - Upload files directly through Telegram bot
- 📱 **RESTful API** - Simple HTTP API for integration
- 💾 **File Storage** - Documents stored as individual files with metadata in database

## Quick Start

### API Endpoints

#### Create Document
```bash
POST /api/documents
```

**Request Body:**
```json
{
  "content": "# Your markdown content here",
  "password": "optional-password",
  "expiration": "1h|1d|1w|never",
  "customId": "optional-custom-id"
}
```

**Response:**
```json
{
  "id": "generated-or-custom-id",
  "message": "Document created successfully"
}
```

#### Retrieve Document
```bash
GET /api/documents/:id?password=your-password
```

**Response:**
```json
{
  "content": "markdown content",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "expiresAt": "2024-01-01T01:00:00.000Z",
  "hasPassword": true
}
```

## Usage Examples

### Basic Document
```bash
curl -X POST https://md.brew.monster/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Hello World\n\nThis is my markdown document!"
  }'
```

### Password Protected Document
```bash
curl -X POST https://md.brew.monster/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Secret Document\n\nThis is protected!",
    "password": "mysecret123"
  }'
```

### Document with Expiration
```bash
curl -X POST https://md.brew.monster/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Temporary Note\n\nThis expires in 1 hour.",
    "expiration": "1h"
  }'
```

### Custom ID Document
```bash
curl -X POST https://md.brew.monster/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# My Report\n\nQuarterly report content...",
    "customId": "q4-report-2024"
  }'
```

## Telegram Bot

The Telegram bot [@mdview_bot](https://t.me/mdview_bot) allows you to upload markdown files directly:

1. Send a `.md` file (max 10MB) to the bot
2. Receive an instant shareable link
3. Share the link with anyone to view the rendered markdown

### Bot Features
- ✅ Automatic file validation
- 📤 Instant upload to pastebin
- 🔗 Direct shareable links
- 📱 Mobile-friendly interface

## Installation & Setup

### Prerequisites
- Node.js 16+
- SQLite (or your preferred database)
- npm or yarn

### Environment Setup
1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file
DATABASE_URL=sqlite:./database.sqlite
PORT=3930
```

4. Initialize database:
```bash
npm run migrate
```

5. Start the server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

### Telegram Bot Setup
1. Create a bot via [@BotFather](https://t.me/botfather)
2. Update `telegram-bot.js` with your bot token
3. Configure webhook or run bot in polling mode
4. Start the bot:
```bash
node telegram-bot.js
```

## Project Structure

```
markdown-pastebin/
├── routes.js           # API routes and logic
├── db.js              # Database models and connection
├── telegram-bot.js    # Telegram bot implementation
├── md-files/          # Storage directory for markdown files
├── public/            # Static files (if any)
└── README.md          # This file
```

## API Reference

### Document Creation
- **Endpoint:** `POST /api/documents`
- **Content-Type:** `application/json`
- **Max Content Size:** Recommended under 1MB for optimal performance

### Document Retrieval
- **Endpoint:** `GET /api/documents/:id`
- **Query Parameters:** `password` (if document is protected)
- **Response Codes:**
  - `200` - Success
  - `401` - Password required
  - `403` - Invalid password
  - `404` - Document not found
  - `410` - Document expired

### Expiration Options
- `1h` - 1 hour
- `1d` - 1 day
- `1w` - 1 week
- `never` or omit - No expiration

## Security Features

- 🔐 **Password Hashing** - Passwords are hashed using bcrypt
- ⏰ **Automatic Cleanup** - Expired documents are automatically deleted
- 🛡️ **Input Validation** - Content and parameters are validated
- 📁 **File Isolation** - Documents stored in separate files with unique names

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source. Please check the license file for details.

## Support

- 📧 **Issues:** Report bugs and feature requests via GitHub issues
- 💬 **Telegram:** Contact via [@mdview_bot](https://t.me/duongtx)
- 🌐 **Website:** [md.brew.monster](https://md.brew.monster)

---

Made with ❤️ for the markdown community
