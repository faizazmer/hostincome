# HostIncome

SaaS untuk freelance live host (Malaysia). Stack: Vite + React 18 + Tailwind CSS + Recharts + Lucide.

## Cara run dalam VS Code

1. Buka folder `hostincome` dalam VS Code (File > Open Folder).
2. Buka terminal terintegrasi (Ctrl + ` / Cmd + `).
3. Jalankan:

   ```bash
   npm install
   npm run dev
   ```

4. Browser akan terbuka automatik di http://localhost:5173

## Build untuk production

```bash
npm run build      # output dalam /dist
npm run preview    # pratonton hasil build
```

## Nota

- Data kini in-memory (data semaian Jun 2026). Refresh = reset.
- Untuk persist data, sambung ke Supabase: ganti seed `useState` dalam `src/HostIncome.jsx` dengan query.
- Warna brand guna palet Tailwind `violet` (`#6D28D9`) + inline style untuk warna tepat. Tiada config tambahan diperlukan.

## Struktur

```
hostincome/
  src/
    HostIncome.jsx   <- seluruh aplikasi (9 halaman, charts, pengiraan)
    main.jsx         <- entry point
    index.css        <- Tailwind + font
  index.html
  vite.config.js
  tailwind.config.js
  postcss.config.js
  package.json
```
