import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

import fetchFigureHandler from './api/fetch-figure.js'
import processImageHandler from './api/process-image.js'
import uploadWorkImageHandler from './api/upload-work-image.js'
import finalizeImageHandler from './api/finalize-image.js'
import askFigureHandler from './api/ask-figure.js'
import askCatalogHandler from './api/ask-catalog.js'
import sitemapHandler from './api/sitemap.js'
import refreshPricesHandler from './api/refresh-prices.js'
import generateShortHandler from './api/generate-short.js'
import figureMetaHandler from './api/figure-meta.js'
import deleteAccountHandler from './api/delete-account.js'

// Pomocnik: składa body ze streamu POST i odpala handler (dev middleware).
function postJsonMiddleware(handler) {
  return async (req, res) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk.toString() })
    req.on('end', async () => {
      req.body = body
      // Shim API w stylu Vercela (surowy res Node nie ma .status()/.json())
      res.status = (code) => { res.statusCode = code; return res }
      res.json = (data) => {
        if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(data))
        return res
      }
      try {
        await handler(req, res)
      } catch (e) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: e.message }))
      }
    })
  }
}

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
            // WSZYSTKIE parametry (name, series, stream…) — tak jak robi to Vercel.
            // Wcześniej przechodziło tylko `name`, więc dev zachowywał się inaczej niż produkcja.
            const mockReq = {
              method: req.method,
              query: Object.fromEntries(url.searchParams),
              // Nagłówki muszą przejść — bez nich brama moderatora odbiłaby
              // każde wyszukiwanie w środowisku developerskim.
              headers: req.headers,
            };

            // Podajemy PRAWDZIWY res (ma writeHead/write — potrzebne dla SSE),
            // dokładając tylko brakujące skróty w stylu Vercela.
            res.status = (code) => { res.statusCode = code; return res; };
            res.json = (data) => {
              if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return res;
            };

            await fetchFigureHandler(mockReq, res);
          } catch (err) {
            console.error('API Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });

        // Konwersja i wysyłka zdjęcia.
        // Uwaga: ten endpoint miał tu kiedyś własną obsługę bez skrótów
        // `res.status()/.json()` w stylu Vercela. Póki zwracał tylko treść,
        // nikt tego nie zauważył — ale gdy doszła brama moderatora (która
        // odpowiada `res.status(401)`), w środowisku developerskim KAŻDE
        // wywołanie kończyło się błędem 500. Teraz jedzie tym samym
        // pomocnikiem co reszta.
        server.middlewares.use('/api/process-image', postJsonMiddleware(processImageHandler))

        // Upload zdjęcia-kandydata do folderu roboczego (Etap 2)
        server.middlewares.use('/api/upload-work-image', postJsonMiddleware(uploadWorkImageHandler))

        // Finalizacja zdjęcia + sprzątanie folderu roboczego (Etap 2)
        server.middlewares.use('/api/finalize-image', postJsonMiddleware(finalizeImageHandler))

        // Ask AI about this figure — kontekstowy asystent kolekcjonera
        server.middlewares.use('/api/ask-figure', postJsonMiddleware(askFigureHandler))

        // ⚠️ KAŻDY NOWY ENDPOINT MUSI TU TRAFIĆ. Vercel wystawia wszystko
        // z katalogu api/ sam, ale Vite nie wie o tym katalogu nic. Pominięty
        // endpoint działa na produkcji, a lokalnie zwraca stronę HTML — czyli
        // „Unexpected end of JSON input" w przeglądarce, bez śladu w logach
        // serwera. Ten czat złapał to na sobie.
        server.middlewares.use('/api/ask-catalog', postJsonMiddleware(askCatalogHandler))

        // Dynamiczny sitemap.xml (GET, read-only)
        server.middlewares.use('/api/sitemap', (req, res) => sitemapHandler(req, res))

        // Odświeżanie realnych ofert/cen (Etap 3)
        server.middlewares.use('/api/refresh-prices', postJsonMiddleware(refreshPricesHandler))

        // Generowanie shorta (Etap 4)
        server.middlewares.use('/api/generate-short', postJsonMiddleware(generateShortHandler))

        // Usunięcie konta na żądanie właściciela (RODO)
        server.middlewares.use('/api/delete-account', postJsonMiddleware(deleteAccountHandler))

        // Wizytówka figurki dla robotów (podgląd linku pod filmem).
        // Na produkcji kieruje tu vercel.json po nagłówku User-Agent; w dev
        // wołamy wprost, żeby dało się sprawdzić podgląd bez wdrażania.
        server.middlewares.use('/api/figure-meta', async (req, res) => {
          const url = new URL(req.originalUrl || req.url, `http://${req.headers.host || 'localhost'}`)
          res.status = (code) => { res.statusCode = code; return res }
          res.send = (html) => { res.end(html); return res }
          try {
            await figureMetaHandler({ method: req.method, query: Object.fromEntries(url.searchParams) }, res)
          } catch (e) {
            res.statusCode = 500
            res.end(e.message)
          }
        })
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
