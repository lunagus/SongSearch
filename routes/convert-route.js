import express from 'express';
import { resolveMetadata } from '../resolvers/resolvers.js';
import { mapToPlatform } from '../mappers/mappers.js';

const router = express.Router();

router.get('/convert', async (req, res) => {
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

export default router;
