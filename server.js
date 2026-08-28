import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Middleware for JSON parsing if needed
app.use(express.json());

// Serve static files from root directory
app.use(express.static(__dirname));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Explicit route fallbacks
app.get('/generator', (req, res) => {
  res.sendFile(path.join(__dirname, 'generator.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Certificate Verification Portal server running at http://${HOST}:${PORT}`);
});
