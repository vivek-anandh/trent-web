# Trent Web - AngularJS Portfolio Management App

A simple AngularJS 1.x application for managing investment portfolios (funds, books, holdings) with performance analytics and charts.

## Tech Stack
- **AngularJS 1.8.2** with `ngRoute` for routing
- **Bootstrap 5.1** for UI
- **Bootstrap Icons** for icons
- **Chart.js** for data visualization (NAV history, investment tracking, portfolio performance)
- **Vanilla JS** for API calls (XMLHttpRequest)

## Project Structure
```
trent-web/
├── index.html                      # Main layout with nav + ng-view
├── app.js                          # Angular app, routes, shared config
├── DashboardController.js          # Home dashboard controller (portfolio calculations, fetchApi with caching)
├── PortfolioPerformanceController.js # Portfolio performance screen (multi-fund charts)
├── FundDetailController.js         # Fund detail screen (single-fund NAV + investment charts)
├── Login.js                        # Auth flow (OIDC/Cognito, URL cleanup after auth)
├── TrentCSS.css                    # Custom styles (design system, chart overlay, modals)
├── home.html                       # Portfolio dashboard view (fund tiles, slide-over detail)
├── portfolio-performance.html      # Portfolio performance view (4 charts with fullscreen)
├── fund-detail.html                # Fund detail view (NAV chart, invested vs value, transactions)
├── maintain-book.html              # Book entries CRUD (fund transactions)
├── maintain-fund.html              # Fund master data CRUD
├── data/api.json                   # Local dev API mock (10 funds with transactions/portfolio)
└── data/api-full.json              # Full API mock
```

## Routes
| Route | Template | Controller | Description |
|-------|----------|------------|-------------|
| `/` | `home.html` | `TrentAngularAppController` | Portfolio dashboard with fund tiles |
| `/maintain-book` | `maintain-book.html` | `MaintainBookController` | Fund transaction CRUD |
| `/maintain-fund` | `maintain-fund.html` | `MaintainFundController` | Fund master data CRUD |
| `/portfolio-performance` | `portfolio-performance.html` | `PortfolioPerformanceController` | Multi-fund performance charts |
| `/fund-detail/:fundId` | `fund-detail.html` | `FundDetailController` | Single-fund detail with NAV + investment charts |

## Screens

### Home Dashboard (`/`)
- Stat strip with today's value, current value, investment, unrealized, realized, gross
- Sortable/searchable fund tiles with allocation bars
- Click tile → slide-over panel with fund stats, portfolio breakdown, and transactions
- "View Detail" button → navigates to Fund Detail screen

### Portfolio Performance (`/portfolio-performance`)
- Quarterly/Yearly toggle
- Stats summary: total investment, current value, gain/loss with %
- **4 charts** (all support click-to-expand fullscreen):
  1. **Invested vs Value by Period** — line chart comparing investment and value over time
  2. **Fund-wise Value Over Time** — multi-line chart showing each fund's value trend
  3. **Gain/Loss by Period** — bar chart showing per-period profit/loss (green/red)
  4. **Value Distribution by Fund** — doughnut chart with % allocation labels
- Indian number formatting (`₹1,23,456`) on all tooltips and Y-axes
- Integer values in hover tooltips (no decimals)

### Fund Detail (`/fund-detail/:fundId`)
- Fund header with name, type, family, current NAV, NAV date
- Stats: invested, current value, gain/loss with %, today's change
- **Quarterly/Yearly toggle** + **Range selector** (1Y / 2Y / 3Y / 5Y)
- **2 charts** (both support click-to-expand fullscreen):
  1. **NAV Performance Over Time** — line chart of fund's NAV history (up to 5 years), dense point rendering
  2. **Your Investment Journey** — invested vs value line chart over time
- Transactions table with buy/sell badges, quantity, price, amount
- "Back to Dashboard" link

## Key Features

### NAV Data Fetching
- Real NAV history from `https://api.mfapi.in/mf/{fundId}`
- **24-hour localStorage caching** via `fetchApi()` (shared between Dashboard and Portfolio Performance)
- Cache key: `nav_hist_{fundId}`, stores `{ savedAt, expiresAt, content }`
- Graceful fallback: if API fails, charts render with available data

### Chart Fullscreen (Grafana-style)
- Click any chart card header icon → full-screen overlay (92vw × 88vh)
- Close via × button, click outside, or ESC key
- Charts recreated on overlay canvas using factory functions (fresh configs each time)

### Auth
- OIDC flow via Cognito (`Login.js`)
- URL cleanup after auth code exchange (removes `?code=...&state=...` from URL)
- Token stored in `accessToken` global, injected via `$httpProvider` interceptor

## Setup
```bash
# Serve locally
npx http-server . -p 8081
# or
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8081` (or 3000/8080).

## Configuration
- **prodMode** in `app.js` (line 1): `true` = calls AWS API Gateway, `false` = uses local `data/api.json`
- **accessToken** in `app.js` (line 2): Set via `Login.js` auth flow (Cognito OIDC)
- **API Base**: `https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/`
- **NAV API**: `https://api.mfapi.in/mf/{fundId}` (public, no auth required)

## API Endpoints (prodMode)
| Endpoint | Method | Body |
|----------|--------|------|
| `/UAT/holdings` | GET | - |
| `/UAT/book` | GET/POST | `{fundId, quantity, price, date, action?}` |
| `/UAT/funds` | GET/POST | `{fundId, fundName, fundType, fundFamily, action?}` |

## Adding a New Screen
1. Create `new-screen.html` template
2. Create `NewScreenController.js` (include in `index.html`)
3. Add route in `app.js`:
```js
.when('/new-screen', {
    templateUrl: 'new-screen.html',
    controller: 'NewScreenController'
})
```
4. Add nav link in `index.html`:
```html
<a class="nav-link" ng-class="{active: isActive('/new-screen')}" href="#!/new-screen">New Screen</a>
```

## Styles
Custom styles in `TrentCSS.css` (Trent brand colors, card layouts, modals, tables, chart fullscreen overlay).
