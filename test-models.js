import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const key = process.env.VITE_GEMINI_API_KEY;
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
  .then(res => res.json())
  .then(data => console.log(data.models ? data.models.map(m => m.name).join('\n') : data))
  .catch(console.error);
