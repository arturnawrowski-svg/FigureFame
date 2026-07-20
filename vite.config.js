import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

import fetchFigureHandler from './api/fetch-figure.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {
        server.middlewares.use('/api/fetch-figure', async (req, res) => {
          try {
            const url = new URL(req.originalUrl || req.url, `http://${req.headers.host || 'localhost'}`);
            const name = url.searchParams.get('name');
            
            const mockReq = {
              method: req.method,
              query: { name }
            };
            
            const mockRes = {
              status: (code) => {
                res.statusCode = code;
                return mockRes;
              },
              json: (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              }
            };
            
            await fetchFigureHandler(mockReq, mockRes);
          } catch (err) {
            console.error('API Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom')
    }
  }
})
