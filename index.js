const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// API routes
app.use('/api', apiRoutes);

// Route for /v/:id - serves the view.html file
app.get('/v/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

// Basic route for testing
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Markdown Viewer API is running' });
});

// Initialize database and start server
async function startServer() {
    await initDatabase();
    
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Visit http://localhost:${PORT} to access the application`);
    });
}

startServer().catch(console.error); 