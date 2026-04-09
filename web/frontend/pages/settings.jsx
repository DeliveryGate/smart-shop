import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Button,
  Spinner, Box, TextField, Divider, Toast, Frame, Banner, Select,
} from "@shopify/polaris";

const PLANS = [
  { key: "free",       label: "Free",       price: "$0",   description: "Basic filtering, up to 20 products." },
  { key: "starter",    label: "Starter",    price: "$19/mo", description: "Unlimited products, portion selectors, dietary badges, promotional banner." },
  { key: "pro",        label: "Pro",        price: "$39/mo", description: "Volume discount tiers, filter analytics, add-to-cart from collection." },
  { key: "enterprise", label: "Enterprise", price: "$99/mo", description: "Custom filter UI, multi-collection support, A/B testing." },
];

const PLAN_BADGE = { free: undefined, starter: "info", pro: "success", enterprise: "warning" };

export default function Settings() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";

  const [billing, setBilling] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upgrading, setUpgrading] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Local editable state
  const [accentColor, setAccentColor] = useState("#309B42");
  const [tiers, setTiers] = useState([]);
  const [promoBannerText, setPromoBannerText] = useState("");
  const [promoBannerUrl, setPromoBannerUrl] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/billing/status?shop=${shop}`).then((r) => r.json()),
      fetch(`/api/config?shop=${shop}`).then((r) => r.json()),
    ]).then(([b, c]) => {
      setBilling(b);
      setConfig(c);
      setAccentColor(c.accentColor || "#309B42");
      setTiers(c.volumeDiscountTiers || []);
      setPromoBannerText(c.promoBannerText || "");
      setPromoBannerUrl(c.promoBannerUrl || "");
    }).finally(() => setLoading(false));
  }, [shop]);

  const saveConfig = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/config?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accentColor, volumeDiscountTiers: tiers, promoBannerText, promoBannerUrl }),
      });
      setToastMsg("Settings saved");
    } catch {
      setToastMsg("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [accentColor, tiers, promoBannerText, promoBannerUrl, shop]);

  const subscribe = useCallback(async (plan) => {
    setUpgrading(plan);
    try {
      const res = await fetch(`/api/billing/subscribe?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.confirmationUrl) {
        window.top.location.href = data.confirmationUrl;
      } else {
        setToastMsg(data.error || "Subscription failed");
      }
    } catch {
      setToastMsg("Subscription request failed");
    } finally {
      setUpgrading(null);
    }
  }, [shop]);

  const addTier = () => setTiers((prev) => [...prev, { min: 0, message: "" }]);
  const removeTier = (i) => setTiers((prev) => prev.filter((_, idx) => idx !== i));

  if (loading) {
    return (
      <Page title="Settings">
        <Layout><Layout.Section><Card><Box padding="800"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Card></Layout.Section></Layout>
      </Page>
    );
  }

  const currentPlan = billing?.plan || "free";

  return (
    <Frame>
      <Page
        title="Settings"
        backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}
        primaryAction={{ content: "Save settings", onAction: saveConfig, loading: saving }}
      >
        <Layout>
          {/* Plan */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h2">Plan</Text>
                  <Badge tone={PLAN_BADGE[currentPlan]}>
                    {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                  </Badge>
                </InlineStack>
                <Divider />
                <BlockStack gap="300">
                  {PLANS.map((p) => {
                    const isCurrent = p.key === currentPlan;
                    const isFree = p.key === "free";
                    return (
                      <Box
                        key={p.key}
                        padding="400"
                        borderWidth="025"
                        borderRadius="200"
                        borderColor={isCurrent ? "border-focus" : "border"}
                        background={isCurrent ? "bg-surface-selected" : "bg-surface"}
                      >
                        <InlineStack align="space-between" blockAlign="start">
                          <BlockStack gap="100">
                            <InlineStack gap="200" blockAlign="center">
                              <Text variant="bodyMd" fontWeight="bold" as="span">{p.label}</Text>
                              <Text variant="bodyMd" tone="subdued" as="span">{p.price}</Text>
                              {isCurrent && <Badge tone={PLAN_BADGE[p.key]}>Current plan</Badge>}
                            </InlineStack>
                            <Text variant="bodySm" tone="subdued" as="p">{p.description}</Text>
                          </BlockStack>
                          {!isCurrent && !isFree && (
                            <Button
                              size="slim"
                              variant="primary"
                              loading={upgrading === p.key}
                              onClick={() => subscribe(p.key)}
                            >
                              Upgrade
                            </Button>
                          )}
                        </InlineStack>
                      </Box>
                    );
                  })}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Accent colour */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Appearance</Text>
                <Divider />
                <InlineStack gap="300" blockAlign="center">
                  <TextField
                    label="Accent colour (hex)"
                    value={accentColor}
                    onChange={setAccentColor}
                    autoComplete="off"
                    helpText="Used for active filter tiles and CTA buttons in the theme block."
                    prefix="#"
                  />
                  <Box
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: accentColor.startsWith("#") ? accentColor : `#${accentColor}`,
                      border: "1px solid rgba(0,0,0,0.12)",
                      flexShrink: 0,
                    }}
                  />
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Volume discount tiers (pro+) */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <InlineStack gap="200" blockAlign="center">
                      <Text variant="headingMd" as="h2">Volume Discount Tiers</Text>
                      <Badge tone="success">Pro+</Badge>
                    </InlineStack>
                    <Text variant="bodySm" tone="subdued">
                      Banners shown on the collection page to encourage larger orders. Requires Pro plan or above.
                    </Text>
                  </BlockStack>
                  <Button
                    onClick={addTier}
                    disabled={!["pro", "enterprise"].includes(currentPlan)}
                  >
                    Add tier
                  </Button>
                </InlineStack>
                {!["pro", "enterprise"].includes(currentPlan) && (
                  <Banner tone="info">
                    Upgrade to Pro or Enterprise to configure volume discount banners.
                  </Banner>
                )}
                {["pro", "enterprise"].includes(currentPlan) && (
                  <BlockStack gap="200">
                    {tiers.length === 0 && (
                      <Text tone="subdued">No tiers configured. Click "Add tier" to create a volume discount banner.</Text>
                    )}
                    {tiers.map((tier, i) => (
                      <InlineStack key={i} gap="200" blockAlign="end">
                        <TextField
                          label="Min quantity"
                          type="number"
                          value={String(tier.min)}
                          onChange={(v) =>
                            setTiers((prev) => prev.map((t, idx) => idx === i ? { ...t, min: parseInt(v) || 0 } : t))
                          }
                          autoComplete="off"
                        />
                        <TextField
                          label="Banner message"
                          value={tier.message}
                          onChange={(v) =>
                            setTiers((prev) => prev.map((t, idx) => idx === i ? { ...t, message: v } : t))
                          }
                          autoComplete="off"
                          placeholder="Order 50+ and save 10%"
                        />
                        <Button tone="critical" size="slim" onClick={() => removeTier(i)}>Remove</Button>
                      </InlineStack>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Promo banner (starter+) */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="headingMd" as="h2">Promotional Banner</Text>
                    <Badge tone="info">Starter+</Badge>
                  </InlineStack>
                  <Text variant="bodySm" tone="subdued">
                    An optional banner shown above the product grid. Requires Starter plan or above.
                  </Text>
                </BlockStack>
                {currentPlan === "free" && (
                  <Banner tone="info">
                    Upgrade to Starter or above to enable the promotional banner.
                  </Banner>
                )}
                {currentPlan !== "free" && (
                  <>
                    <TextField
                      label="Banner text"
                      value={promoBannerText}
                      onChange={setPromoBannerText}
                      autoComplete="off"
                      placeholder="e.g. Free delivery on orders over £50"
                    />
                    <TextField
                      label="Banner link URL"
                      value={promoBannerUrl}
                      onChange={setPromoBannerUrl}
                      autoComplete="off"
                      placeholder="https://yourstore.com/pages/delivery"
                    />
                  </>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Support */}
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Support</Text>
                <Text as="p" tone="subdued">
                  Built by SaltCore — <a href="https://saltai.app" target="_blank" rel="noopener noreferrer">saltai.app</a>
                </Text>
                <Text as="p" tone="subdued">
                  Questions? Email <a href="mailto:support@saltai.app">support@saltai.app</a>
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Built and proven in production at Vanda's Kitchen — London caterers supplying Selfridges, Accenture, Red Bull, and Epic Games.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {toastMsg && <Toast content={toastMsg} onDismiss={() => setToastMsg("")} />}
      </Page>
    </Frame>
  );
}
