import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveMetadata } from './resolvers/index.js';
import { mapToPlatform } from './mappers/index.js';

dotenv.config();
const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/convert', async (req, res) => {
  const { link, to } = req.query;

  if (!link || !to) {
    return res.status(400).send('Missing "link" or "to" query param');
  }

  try {
    const metadata = await resolveMetadata(link); 
    const targetUrl = await mapToPlatform(metadata, to);

    if (!targetUrl) {
      return res.status(404).send('No match found on target platform.');
    }

    return res.redirect(302, targetUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error processing link');
  }
});

app.listen(3000, () => {
  console.log('Listening on http://localhost:3000');
});
