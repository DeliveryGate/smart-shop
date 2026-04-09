import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page, Layout, Card, Banner, Button, Text, BlockStack, InlineStack,
  Badge, Spinner, Box, DataTable, Divider,
} from "@shopify/polaris";

const PLAN_COLORS = { free: undefined, starter: "info", pro: "success", enterprise: "warning" };

export default function Dashboard() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";
  const [billing, setBilling] = useState(null);
  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/billing/status?shop=${shop}`).then((r) => r.json()),
      fetch(`/api/config?shop=${shop}`).then((r) => r.json()),
      fetch(`/api/products?shop=${shop}`).then((r) => r.json()),
    ])
      .then(([b, c, p]) => {
        setBilling(b);
        setConfig(c);
        setProducts(p.products || []);
      })
      .finally(() => setLoading(false));
  }, [shop]);

  if (loading) {
    return (
      <Page title="Smart Shop">
        <Layout><Layout.Section><Card><Box padding="800"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Card></Layout.Section></Layout>
      </Page>
    );
  }

  const plan = billing?.plan || "free";
  const taggedCount = products.filter((p) => p.dietaryTags?.length > 0 || p.categories?.length > 0).length;
  const activeCategories = (config?.productCategories || []).filter((c) => c.active);
  const activeDietary = (config?.dietaryFilters || []).filter((d) => d.active);

  return (
    <Page
      title="Smart Shop — Dietary Filter Collection"
      primaryAction={{ content: "Configure Filters", onAction: () => navigate(`/filters?shop=${shop}`) }}
      secondaryActions={[
        { content: "Tag Products", onAction: () => navigate(`/products?shop=${shop}`) },
        { content: "Settings", onAction: () => navigate(`/settings?shop=${shop}`) },
      ]}
    >
      <Layout>
        {plan === "free" && (
          <Layout.Section>
            <Banner
              title="You're on the Free plan — limited to 20 products"
              tone="info"
              action={{ content: "Upgrade to Starter", onAction: () => navigate(`/settings?shop=${shop}`) }}
            >
              Upgrade to Starter ($19/mo) for unlimited products, portion selectors, and dietary badges.
            </Banner>
          </Layout.Section>
        )}

        {/* Stat cards */}
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Total Products</Text>
              <Text variant="headingXl" as="p">{products.length}</Text>
              <Text variant="bodySm" tone="subdued">
                {plan === "free" ? `Free plan: up to 20` : "Unlimited on this plan"}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Tagged Products</Text>
              <Text variant="headingXl" as="p">{taggedCount}</Text>
              <Text variant="bodySm" tone="subdued">
                {products.length > 0 ? `${Math.round((taggedCount / products.length) * 100)}% tagged` : "No products"}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">Plan</Text>
              <Badge tone={PLAN_COLORS[plan]}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</Badge>
              <Text variant="bodySm" tone="subdued">
                {plan === "free" ? "$0 / month" : plan === "starter" ? "$19 / month" : plan === "pro" ? "$39 / month" : "$99 / month"}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Filter preview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h2">Filter Configuration Preview</Text>
                <Button variant="plain" onClick={() => navigate(`/filters?shop=${shop}`)}>Edit filters</Button>
              </InlineStack>
              <Divider />
              <InlineStack gap="400" wrap>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Product Categories ({activeCategories.length} active)</Text>
                  <InlineStack gap="200" wrap>
                    {activeCategories.slice(0, 6).map((c) => (
                      <Badge key={c.id}>{c.emoji} {c.label}</Badge>
                    ))}
                    {activeCategories.length > 6 && <Badge tone="subdued">+{activeCategories.length - 6} more</Badge>}
                    {activeCategories.length === 0 && <Text tone="subdued">No categories configured</Text>}
                  </InlineStack>
                </BlockStack>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Dietary Filters ({activeDietary.length} active)</Text>
                  <InlineStack gap="200" wrap>
                    {activeDietary.slice(0, 6).map((d) => (
                      <Badge key={d.id} tone="success">{d.label}</Badge>
                    ))}
                    {activeDietary.length > 6 && <Badge tone="subdued">+{activeDietary.length - 6} more</Badge>}
                    {activeDietary.length === 0 && <Text tone="subdued">No dietary filters configured</Text>}
                  </InlineStack>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Recent products */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h2">Products</Text>
                <Button variant="plain" onClick={() => navigate(`/products?shop=${shop}`)}>View all</Button>
              </InlineStack>
              {products.length === 0 ? (
                <Text tone="subdued">No products found. Make sure your Shopify store has products.</Text>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "text"]}
                  headings={["Product", "Categories", "Dietary Tags", "Status"]}
                  rows={products.slice(0, 8).map((p) => [
                    p.title,
                    p.categories?.length > 0 ? p.categories.join(", ") : "—",
                    p.dietaryTags?.length > 0 ? p.dietaryTags.join(", ") : "—",
                    p.status || "active",
                  ])}
                />
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Getting started */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">Getting Started</Text>
              <Text as="p">Follow these steps to set up Smart Shop on your collection page:</Text>
              <BlockStack gap="200">
                <Text as="p"><strong>1.</strong> Go to <strong>Filters</strong> and configure your product categories and dietary filters.</Text>
                <Text as="p"><strong>2.</strong> Go to <strong>Products</strong> and assign categories and dietary tags to each product.</Text>
                <Text as="p"><strong>3.</strong> In your Shopify theme editor, add the <strong>Smart Shop</strong> app block to your collection page template.</Text>
                <Text as="p"><strong>4.</strong> Customers can now filter your collection by food type and dietary requirements simultaneously.</Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
