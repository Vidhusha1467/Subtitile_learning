import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, 'src', 'index.css');
const lines = fs.readFileSync(file, 'utf8').split('\n');

// Keep only up to line 2080 (index 2079)
const clean = lines.slice(0, 2081).join('\n');
fs.writeFileSync(file, clean, 'utf8');

console.log('Done. Total lines:', clean.split('\n').length);
