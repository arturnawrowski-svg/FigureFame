import 'dotenv/config';
import handler from './api/fetch-figure.js';

const req = { method: 'GET', query: { name: 'Levi - Fortitude Ver.' } };
const res = {
  status: (code) => ({ json: (data) => console.log('STATUS', code, JSON.stringify(data, null, 2)) }),
  json: (data) => console.log('JSON', JSON.stringify(data, null, 2))
};

handler(req, res).catch(console.error);
