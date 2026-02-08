import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import api from './routes/api.js';
import { ensureSchema } from './db.js';
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api', api);

// Serve frontend in production
const clientDist = join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(join(clientDist, 'index.html'));
});

async function start() {
  await ensureSchema();
  app.listen(PORT, () => {
    console.log(`VoteTheTicker server running at http://localhost:${PORT}`);
  });
}
start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
