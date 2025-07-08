import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import convertRouter from './routes/convert.js';

dotenv.config();
const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/', convertRouter);

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
