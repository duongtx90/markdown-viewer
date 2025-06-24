const express = require('express');
const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');
const { Document } = require('./db');
const router = express.Router();
const { nanoid } = require('nanoid');

// Helper function to generate filename with format: {nanoid}-{yyyymmdd}-{hhmmss}.md
function generateFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const id = nanoid(8); // 8 character nanoid
    const dateStr = `${year}${month}${day}`;
    const timeStr = `${hours}${minutes}${seconds}`;
    
    return `${id}-${dateStr}-${timeStr}.md`;
}

// Helper function to get the full file path
function getFilePath(filename) {
    return path.join(__dirname, 'md-files', filename);
}

// Helper function to parse expiration time
function parseExpiration(expiration) {
    if (!expiration || expiration === 'never') return null;
    
    const now = new Date();
    
    switch (expiration) {
        case '1h':
            return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
        case '1d':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day
        case '1w':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
        default:
            return null;
    }
}

// POST /api/documents - Create a new document
router.post('/documents', async (req, res) => {
    try {
        const { content, password, expiration, customId } = req.body;
        
        // Validate content
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Content is required and cannot be empty' });
        }
        
        // Hash password if provided
        let passwordHash = null;
        if (password && password.trim() !== '') {
            passwordHash = await bcrypt.hash(password, 10);
        }
        
        // Calculate expiration date
        const expiresAt = parseExpiration(expiration);
        
        // Handle ID generation or validation
        let id;
        if (customId && customId.trim() !== '') {
            // Check if custom ID already exists
            const existingDocument = await Document.findByPk(customId.trim());
            
            if (existingDocument) {
                // Check if existing document is still alive (not expired)
                if (!existingDocument.expiresAt || new Date() <= existingDocument.expiresAt) {
                    return res.status(409).json({ 
                        error: 'Document with this ID already exists and is still active' 
                    });
                } else {
                    // Document exists but is expired, delete it first
                    const oldFilePath = getFilePath(existingDocument.filename);
                    try {
                        await fs.unlink(oldFilePath);
                    } catch (err) {
                        console.warn('Could not delete expired file:', oldFilePath);
                    }
                    await existingDocument.destroy();
                }
            }
            
            id = customId.trim();
        } else {
            // Generate unique ID
            id = nanoid(6); // 6 character ID
        }
        
        // Generate filename and create file
        const filename = generateFilename();
        const filePath = getFilePath(filename);
        
        // Ensure md-files directory exists
        const dirPath = path.dirname(filePath);
        await fs.mkdir(dirPath, { recursive: true });
        
        // Write content to file
        await fs.writeFile(filePath, content.trim(), 'utf8');
        
        // Create document record
        const document = await Document.create({
            id,
            filename,
            passwordHash,
            expiresAt,
            createdAt: new Date()
        });
        
        res.status(201).json({ 
            id: document.id,
            message: 'Document created successfully'
        });
        
    } catch (error) {
        console.error('Error creating document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/documents/:id - Retrieve a document
router.get('/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.query; // Password can be passed as query parameter
        
        // Find document
        const document = await Document.findByPk(id);
        
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        // Check if document is expired
        if (document.expiresAt && new Date() > document.expiresAt) {
            // Delete expired document and file
            const filePath = getFilePath(document.filename);
            try {
                await fs.unlink(filePath);
            } catch (err) {
                console.warn('Could not delete expired file:', filePath);
            }
            await document.destroy();
            return res.status(410).json({ error: 'Document has expired' });
        }
        
        // Check password if document is protected
        if (document.passwordHash) {
            if (!password) {
                return res.status(401).json({ 
                    error: 'Password required',
                    passwordRequired: true 
                });
            }
            
            const isPasswordValid = await bcrypt.compare(password, document.passwordHash);
            if (!isPasswordValid) {
                return res.status(403).json({ 
                    error: 'Invalid password',
                    passwordRequired: true 
                });
            }
        }
        
        // Read content from file
        const filePath = getFilePath(document.filename);
        let content;
        try {
            content = await fs.readFile(filePath, 'utf8');
        } catch (err) {
            console.error('Error reading file:', err);
            return res.status(500).json({ error: 'Could not read document content' });
        }
        
        // Return document content
        res.json({
            content,
            createdAt: document.createdAt,
            expiresAt: document.expiresAt,
            hasPassword: !!document.passwordHash
        });
        
    } catch (error) {
        console.error('Error retrieving document:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 