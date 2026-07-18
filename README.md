# Trent Web - AngularJS Portfolio Management App

A simple AngularJS 1.x application for managing investment portfolios (funds, books, holdings).

## Tech Stack
- **AngularJS 1.8.2** with `ngRoute` for routing
- **Bootstrap 5.1** for UI
- **Bootstrap Icons** for icons
- **Vanilla JS** for API calls (XMLHttpRequest)

## Project Structure
```
trent-web/
├── index.html              # Main layout with nav + ng-view
├── app.js                  # Angular app, routes, controllers (MaintainBook, MaintainFund)
├── DashboardController.js  # Home dashboard controller (portfolio calculations)
├── Login.js                # Auth flow (Auth0/token handling)
├── home.html               # Portfolio dashboard view
├── maintain-book.html      # Book entries CRUD (fund transactions)
├── maintain-fund.html      # Fund master data CRUD
├── TrentCSS.css            # Custom styles
├── data/api.json           # Local dev API mock
└── data/api-full.json      # Full API mock
```

## Routes
| Route | Template | Controller |
|-------|----------|------------|
| `/` | `home.html` | `TrentAngularAppController` |
| `/maintain-book` | `maintain-book.html` | `MaintainBookController` |
| `/maintain-fund` | `maintain-fund.html` | `MaintainFundController` |

## Setup
```bash
# Serve locally (any static server)
npx serve .
# or
python -m http.server 8000
```

Open `http://localhost:8000` (or 3000/8080).

## Configuration
- **prodMode** in `app.js` (line 1): `true` = calls AWS API Gateway, `false` = uses local `data/api.json`
- **accessToken** in `app.js` (line 2): Set via `Login.js` auth flow (Auth0)
- **API Base**: `https://8ecbjv99ca.execute-api.ap-south-1.amazonaws.com/UAT/`

## Adding a New Screen
1. Create `new-screen.html` template
2. Add controller in `app.js` (or new file, include in `index.html`)
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
5. Include new controller JS in `index.html` if separate file

## API Endpoints (prodMode)
| Endpoint | Method | Body |
|----------|--------|------|
| `/UAT/holdings` | GET | - |
| `/UAT/book` | GET/POST | `{fundId, quantity, price, date, action?}` |
| `/UAT/funds` | GET/POST | `{fundId, fundName, fundType, fundFamily, action?}` |

## Auth
- Uses Auth0 implicit flow (`Login.js`)
- Token stored in `accessToken` global
- Injected via `$httpProvider` interceptor in `app.js`

## Styles
Custom styles in `TrentCSS.css` (Trent brand colors, card layouts, modals, tables).