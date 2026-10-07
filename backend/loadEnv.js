import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

dotenv.config({ path: envPath });

if (!process.env.GROQ_API_KEY) {
  console.warn('⚠️ GROQ_API_KEY not found in environment variables.');
} else {
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  console.log(`✅ Groq AI initialized with model: ${model}`);
}
