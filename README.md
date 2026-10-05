# MAETRADE — Front-end Foundation

A mobile-first static foundation for MAETRADE, a Personal Trading Operating System.

## Included

- Premium dark financial UI + light mode
- Responsive desktop/tablet/mobile layouts
- Sidebar + mobile bottom navigation
- Dashboard with data-driven KPIs
- Equity curve from stored closed trades
- Functional multi-step New Trade flow
- Trade CRUD via localStorage
- Trade History filters
- Technical Analysis workspace
- Trading Journal view
- Cashflow CRUD
- Report starter screens
- Settings
- JSON export / local demo-data reset

## Run

No build step is required.

Open `index.html` directly in a browser, or serve the folder from any static host / GitHub Pages.

## Storage

Current persistence is browser `localStorage`.

This is intentionally a foundation layer. Replace the storage functions in `app.js` with MAETRADE's real backend:

- Cloudflare Workers
- D1
- Hono
- Drizzle

The UI/data contract is kept simple so the backend can be swapped in without redesigning the product.

## Important

The example P&L formula is a front-end placeholder intended to demonstrate the data flow. For production trading calculations, replace `calcTradePnl()` with broker/account-specific contract specifications and server-side validation.
