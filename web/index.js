import express from "express";
import compression from "compression";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";
import serveStatic from "serve-static";
import { verifyWebhookHmac, shopifyGraphQL, PLANS, CREATE_SUBSCRIPTION } from "./shopify.js";
import { verifyRequest } from "./middleware/verify-request.js";
import { fetchAllProducts, mergeWithMeta, DEFAULT_CATEGORIES, DEFAULT_DIETARY_FILTERS } from "./lib/productHelpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);
const IS_PROD = process.env.NODE_ENV === "production";

app.use(compression());
app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());
app.get("/health", (req, res) => res.json({ status: "ok", app: "smart-shop" }));

// ─── Webhooks (GDPR + app/uninstall) ─────────────────────────────────────────
app.post("/api/webhooks/:topic", async (req, res) => {
  const hmac = req.headers["x-shopify-hmac-sha256"];
  if (!hmac || !verifyWebhookHmac(req.body.toString(), hmac, process.env.SHOPIFY_API_SECRET)) {
    return res.status(401).send("Unauthorized");
  }
  const shop = req.headers["x-shopify-shop-domain"];
  try {
    const topic = req.params.topic;
    if (topic === "app-uninstalled" || topic === "shop-redact") {
      await prisma.productMeta.deleteMany({ where: { shop } });
      await prisma.merchantPlan.deleteMany({ where: { shop } });
      await prisma.session.deleteMany({ where: { shop } });
    }
    if (topic === "customers-redact" || topic === "customers-data-request") {
      // No PII stored — no-op, return 200
    }
    res.status(200).send("OK");
  } catch (err) {
    console.error(`[webhook] error:`, err);
    res.status(500).send("Error");
  }
});

// ─── Helper: get or seed MerchantPlan ────────────────────────────────────────
async function getMerchant(shop) {
  let merchant = await prisma.merchantPlan.findUnique({ where: { shop } });
  if (!merchant) {
    merchant = await prisma.merchantPlan.create({
      data: {
        shop,
        productCategories: JSON.stringify(DEFAULT_CATEGORIES),
        dietaryFilters: JSON.stringify(DEFAULT_DIETARY_FILTERS),
      },
    });
  }
  return merchant;
}

// ─── Products ─────────────────────────────────────────────────────────────────
// GET /api/products — list all products with merged meta
app.get("/api/products", verifyRequest, async (req, res) => {
  const { shop, accessToken } = req.shopSession;
  const merchant = await getMerchant(shop);
  const plan = merchant.plan || "free";
  const limit = PLANS[plan]?.productLimit || 20;

  try {
    const [shopifyProducts, metaRows] = await Promise.all([
      fetchAllProducts(shop, accessToken, limit),
      prisma.productMeta.findMany({ where: { shop } }),
    ]);
    const merged = mergeWithMeta(shopifyProducts, metaRows);
    res.json({ products: merged, plan, total: merged.length });
  } catch (err) {
    console.error("[api] products error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch products" });
  }
});

// GET /api/products/:id — get single product meta
app.get("/api/products/:id", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  // id is base64-encoded GID, passed URL-encoded
  const productId = decodeURIComponent(req.params.id);
  try {
    const meta = await prisma.productMeta.findUnique({ where: { shop_productId: { shop, productId } } });
    if (!meta) return res.json({ productId, categories: [], dietaryTags: [], portionSizes: [] });
    res.json({
      ...meta,
      categories: JSON.parse(meta.categories || "[]"),
      dietaryTags: JSON.parse(meta.dietaryTags || "[]"),
      portionSizes: JSON.parse(meta.portionSizes || "[]"),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product meta" });
  }
});

// POST /api/products/:id — save product meta
app.post("/api/products/:id", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const productId = decodeURIComponent(req.params.id);
  const { productTitle = "", categories = [], dietaryTags = [], portionSizes = [] } = req.body;
  try {
    const data = {
      shop,
      productId,
      productTitle,
      categories: JSON.stringify(categories),
      dietaryTags: JSON.stringify(dietaryTags),
      portionSizes: JSON.stringify(portionSizes),
      updatedAt: new Date(),
    };
    const meta = await prisma.productMeta.upsert({
      where: { shop_productId: { shop, productId } },
      create: data,
      update: { productTitle, categories: data.categories, dietaryTags: data.dietaryTags, portionSizes: data.portionSizes, updatedAt: data.updatedAt },
    });
    res.json({ ...meta, categories, dietaryTags, portionSizes });
  } catch (err) {
    console.error("[api] save product meta error:", err);
    res.status(500).json({ error: "Failed to save product meta" });
  }
});

// ─── Config ───────────────────────────────────────────────────────────────────
// GET /api/config — get shop filter config
app.get("/api/config", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  try {
    const merchant = await getMerchant(shop);
    res.json({
      plan: merchant.plan,
      accentColor: merchant.accentColor,
      productCategories: JSON.parse(merchant.productCategories || "[]"),
      dietaryFilters: JSON.parse(merchant.dietaryFilters || "[]"),
      volumeDiscountTiers: JSON.parse(merchant.volumeDiscountTiers || "[]"),
      promoBannerText: merchant.promoBannerText,
      promoBannerUrl: merchant.promoBannerUrl,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch config" });
  }
});

// POST /api/config — save shop config
app.post("/api/config", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const { accentColor, productCategories, dietaryFilters, volumeDiscountTiers, promoBannerText, promoBannerUrl } = req.body;
  const data = {};
  if (accentColor !== undefined) data.accentColor = accentColor;
  if (productCategories !== undefined) data.productCategories = JSON.stringify(productCategories);
  if (dietaryFilters !== undefined) data.dietaryFilters = JSON.stringify(dietaryFilters);
  if (volumeDiscountTiers !== undefined) data.volumeDiscountTiers = JSON.stringify(volumeDiscountTiers);
  if (promoBannerText !== undefined) data.promoBannerText = promoBannerText;
  if (promoBannerUrl !== undefined) data.promoBannerUrl = promoBannerUrl;

  try {
    const merchant = await prisma.merchantPlan.upsert({
      where: { shop },
      create: {
        shop,
        productCategories: JSON.stringify(DEFAULT_CATEGORIES),
        dietaryFilters: JSON.stringify(DEFAULT_DIETARY_FILTERS),
        ...data,
      },
      update: data,
    });
    res.json({
      plan: merchant.plan,
      accentColor: merchant.accentColor,
      productCategories: JSON.parse(merchant.productCategories || "[]"),
      dietaryFilters: JSON.parse(merchant.dietaryFilters || "[]"),
      volumeDiscountTiers: JSON.parse(merchant.volumeDiscountTiers || "[]"),
      promoBannerText: merchant.promoBannerText,
      promoBannerUrl: merchant.promoBannerUrl,
    });
  } catch (err) {
    console.error("[api] config save error:", err);
    res.status(500).json({ error: "Failed to save config" });
  }
});

// ─── Analytics (pro+) ─────────────────────────────────────────────────────────
app.get("/api/analytics", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  const merchant = await getMerchant(shop);
  if (!["pro", "enterprise"].includes(merchant.plan)) {
    return res.status(403).json({ error: "Analytics requires Pro or Enterprise plan", upgrade: true });
  }
  // Stub — in production this would read from an analytics events table
  res.json({
    topCategories: [],
    topDietaryFilters: [],
    filterUsageByDay: [],
    message: "Analytics data will appear here once customers use your collection filters.",
  });
});

// ─── Billing ─────────────────────────────────────────────────────────────────
app.get("/api/billing/status", verifyRequest, async (req, res) => {
  const { shop } = req.shopSession;
  try {
    const merchant = await getMerchant(shop);
    const plan = merchant.plan || "free";
    res.json({
      plan,
      price: PLANS[plan]?.price || 0,
      productLimit: PLANS[plan]?.productLimit || 20,
      accentColor: merchant.accentColor,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch billing status" });
  }
});

app.post("/api/billing/subscribe", verifyRequest, async (req, res) => {
  const { shop, accessToken } = req.shopSession;
  const { plan } = req.body;
  if (!plan || !PLANS[plan] || plan === "free") {
    return res.status(400).json({ error: "Invalid plan" });
  }
  const returnUrl = `${process.env.SHOPIFY_APP_URL}/api/billing/callback?shop=${shop}&plan=${plan}`;
  try {
    const result = await shopifyGraphQL(shop, accessToken, CREATE_SUBSCRIPTION, {
      name: `Smart Shop ${PLANS[plan].name}`,
      returnUrl,
      test: !IS_PROD,
      lineItems: [{ plan: { appRecurringPricingDetails: { price: { amount: PLANS[plan].price, currencyCode: "USD" }, interval: "EVERY_30_DAYS" } } }],
    });
    const { confirmationUrl, userErrors } = result.data.appSubscriptionCreate;
    if (userErrors?.length > 0) return res.status(400).json({ error: "Subscription failed", details: userErrors });
    res.json({ confirmationUrl });
  } catch (err) {
    console.error("[billing] subscribe error:", err);
    res.status(500).json({ error: "Subscription failed" });
  }
});

app.get("/api/billing/callback", async (req, res) => {
  const { shop, plan, charge_id } = req.query;
  if (charge_id && plan && shop) {
    await prisma.merchantPlan.upsert({
      where: { shop },
      create: { shop, plan, subscriptionId: charge_id, productCategories: JSON.stringify(DEFAULT_CATEGORIES), dietaryFilters: JSON.stringify(DEFAULT_DIETARY_FILTERS) },
      update: { plan, subscriptionId: charge_id },
    });
  }
  res.redirect(`/?shop=${shop}`);
});

// ─── Static (production) ──────────────────────────────────────────────────────
if (IS_PROD) {
  app.use(serveStatic(path.join(__dirname, "frontend", "dist")));
  app.get("*", (req, res) => res.sendFile(path.join(__dirname, "frontend", "dist", "index.html")));
}

app.listen(PORT, () => console.log(`Smart Shop backend running on port ${PORT}`));
