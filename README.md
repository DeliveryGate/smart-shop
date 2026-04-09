# Smart Shop — Dietary Filter Collection

**An intelligent collection page for food, health, and lifestyle Shopify stores.**

Customers filter your products by type AND dietary requirement simultaneously — gluten-free, nut-free, vegan, halal, and more — using beautiful exclusion-based filtering. Products show dietary badges and customers can add directly to cart without leaving the collection page.

---

## App Store Copy

**Built and proven in production at Vanda's Kitchen — London caterers supplying Selfridges, Accenture, Red Bull, and Epic Games.**

Replace Shopify's basic product grid with a smart, filterable collection page that helps customers with dietary requirements find exactly what they need. Smart Shop powers the collection page at Vanda's Kitchen, a London catering company serving major corporate clients.

### Features

- **Dietary exclusion filters** — "Without gluten", "Without nuts", "Vegan" — customers choose what to exclude, not what to include
- **Product type tiles** — emoji + label category tiles for fast browsing
- **Dietary badges on cards** — at-a-glance Gluten-free, Nut-free, Vegan, Halal badges
- **Add to cart from collection** — morphing qty control (Add → − 1 +) without leaving the page
- **Portion selector** — multi-variant products show size/serves buttons
- **Volume discount banners** — configurable "Order 50+ and save 10%" messaging
- **Promotional banner** — time-limited offer slot above the grid
- **Product search** — live search within the filtered collection
- **Fully mobile-responsive** — sidebar collapses, tiles horizontal-scroll on mobile

### Plans

| Plan       | Price    | Features |
|------------|----------|----------|
| Free       | $0       | Basic filtering, up to 20 products |
| Starter    | $19/mo   | Unlimited products, portion selectors, dietary badges, promotional banner |
| Pro        | $39/mo   | Volume discount tiers, filter analytics, add-to-cart from collection |
| Enterprise | $99/mo   | Custom filter UI, multi-collection support, A/B testing |

---

## Developer: SaltCore

- Website: [saltai.app](https://saltai.app)
- Support: support@saltai.app

---

## Project Structure

```
smart-shop/
├── Dockerfile
├── railway.json
├── shopify.app.toml
├── prisma/
│   └── schema.prisma
├── web/
│   ├── index.js              # Express backend
│   ├── shopify.js            # Shopify GraphQL + billing helpers
│   ├── package.json
│   ├── middleware/
│   │   └── verify-request.js
│   ├── lib/
│   │   └── productHelpers.js # Product fetch + defaults
│   └── frontend/
│       ├── index.html
│       ├── vite.config.js
│       ├── App.jsx
│       └── pages/
│           ├── index.jsx     # Dashboard
│           ├── products.jsx  # Product tagger
│           ├── filters.jsx   # Filter config
│           └── settings.jsx  # Plan + appearance
└── extensions/
    └── smart-shop/
        ├── shopify.extension.toml
        └── blocks/
            └── smart_shop.liquid  # Theme app extension
```

## Setup

1. Run `shopify app config link` to connect to your Partner Dashboard app
2. Set `DATABASE_URL` and `DIRECT_URL` environment variables (Neon PostgreSQL recommended)
3. Set `SHOPIFY_API_SECRET` and `SHOPIFY_APP_URL`
4. Deploy to Railway — `railway.json` and `Dockerfile` are pre-configured
5. In Shopify theme editor, add the "Smart Shop" app block to your collection template

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | PostgreSQL direct connection string |
| `SHOPIFY_API_SECRET` | From Shopify Partner Dashboard |
| `SHOPIFY_APP_URL` | Your Railway app URL |
| `PORT` | Defaults to 3000 |
| `NODE_ENV` | Set to `production` on Railway |
