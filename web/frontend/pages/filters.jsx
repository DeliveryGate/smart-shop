import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Button,
  Spinner, Box, TextField, Divider, Toast, Frame, Banner, Select,
  Icon, ButtonGroup,
} from "@shopify/polaris";
import { DeleteMajor } from "@shopify/polaris-icons";

function CategoryRow({ cat, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <Box padding="300" borderWidth="025" borderRadius="200" borderColor="border">
      <InlineStack align="space-between" blockAlign="center" wrap={false} gap="200">
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <TextField
            label="Emoji"
            labelHidden
            value={cat.emoji}
            onChange={(v) => onChange({ ...cat, emoji: v })}
            autoComplete="off"
            maxLength={4}
          />
          <TextField
            label="Label"
            labelHidden
            value={cat.label}
            onChange={(v) => onChange({ ...cat, label: v })}
            autoComplete="off"
          />
          <TextField
            label="ID"
            labelHidden
            value={cat.id}
            onChange={(v) => onChange({ ...cat, id: v.toLowerCase().replace(/\s+/g, "-") })}
            autoComplete="off"
            helpText="Slug"
          />
        </InlineStack>
        <InlineStack gap="100" blockAlign="center" wrap={false}>
          <Button size="micro" disabled={isFirst} onClick={onMoveUp}>↑</Button>
          <Button size="micro" disabled={isLast} onClick={onMoveDown}>↓</Button>
          <Button
            size="micro"
            tone={cat.active ? "success" : undefined}
            onClick={() => onChange({ ...cat, active: !cat.active })}
          >
            {cat.active ? "Active" : "Hidden"}
          </Button>
          <Button size="micro" tone="critical" onClick={onDelete}>✕</Button>
        </InlineStack>
      </InlineStack>
    </Box>
  );
}

function DietaryRow({ filter, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <Box padding="300" borderWidth="025" borderRadius="200" borderColor="border">
      <InlineStack align="space-between" blockAlign="center" wrap={false} gap="200">
        <InlineStack gap="200" blockAlign="center" wrap={false}>
          <TextField
            label="Icon"
            labelHidden
            value={filter.icon}
            onChange={(v) => onChange({ ...filter, icon: v })}
            autoComplete="off"
            maxLength={6}
          />
          <TextField
            label="Label"
            labelHidden
            value={filter.label}
            onChange={(v) => onChange({ ...filter, label: v })}
            autoComplete="off"
          />
          <TextField
            label="ID"
            labelHidden
            value={filter.id}
            onChange={(v) => onChange({ ...filter, id: v.toLowerCase().replace(/\s+/g, "-") })}
            autoComplete="off"
            helpText="Slug"
          />
        </InlineStack>
        <InlineStack gap="100" blockAlign="center" wrap={false}>
          <Button size="micro" disabled={isFirst} onClick={onMoveUp}>↑</Button>
          <Button size="micro" disabled={isLast} onClick={onMoveDown}>↓</Button>
          <Button
            size="micro"
            tone={filter.active ? "success" : undefined}
            onClick={() => onChange({ ...filter, active: !filter.active })}
          >
            {filter.active ? "Active" : "Hidden"}
          </Button>
          <Button size="micro" tone="critical" onClick={onDelete}>✕</Button>
        </InlineStack>
      </InlineStack>
    </Box>
  );
}

export default function Filters() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";

  const [categories, setCategories] = useState([]);
  const [dietary, setDietary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    fetch(`/api/config?shop=${shop}`)
      .then((r) => r.json())
      .then((c) => {
        setCategories(c.productCategories || []);
        setDietary(c.dietaryFilters || []);
      })
      .finally(() => setLoading(false));
  }, [shop]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/config?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCategories: categories, dietaryFilters: dietary }),
      });
      setToastMsg("Filters saved");
    } catch {
      setToastMsg("Failed to save filters");
    } finally {
      setSaving(false);
    }
  }, [categories, dietary, shop]);

  const moveItem = (arr, setArr, index, dir) => {
    const newArr = [...arr];
    const swapIdx = index + dir;
    if (swapIdx < 0 || swapIdx >= newArr.length) return;
    [newArr[index], newArr[swapIdx]] = [newArr[swapIdx], newArr[index]];
    setArr(newArr);
  };

  const addCategory = () => {
    setCategories((prev) => [...prev, { id: `category-${Date.now()}`, label: "New Category", emoji: "🍽️", active: true }]);
  };

  const addDietary = () => {
    setDietary((prev) => [...prev, { id: `dietary-${Date.now()}`, label: "New Filter", icon: "✅", active: true }]);
  };

  if (loading) {
    return (
      <Page title="Filters">
        <Layout><Layout.Section><Card><Box padding="800"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Card></Layout.Section></Layout>
      </Page>
    );
  }

  return (
    <Frame>
      <Page
        title="Configure Filters"
        backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}
        primaryAction={{ content: "Save filters", onAction: save, loading: saving }}
      >
        <Layout>
          <Layout.Section>
            <Banner title="Exclusion-based dietary filtering" tone="info">
              Dietary filters work as exclusions — customers select "Without gluten" to see only gluten-free products.
              Tag your products on the Products page after configuring these filters.
            </Banner>
          </Layout.Section>

          {/* Product Categories */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h2">Product Categories</Text>
                    <Text variant="bodySm" tone="subdued">
                      Square tile buttons shown at the top of the filter panel. Customers pick a category to browse.
                    </Text>
                  </BlockStack>
                  <Button onClick={addCategory}>Add category</Button>
                </InlineStack>
                <Divider />
                <BlockStack gap="200">
                  <InlineStack gap="200">
                    <Text variant="bodySm" tone="subdued">Emoji</Text>
                    <Text variant="bodySm" tone="subdued">Label</Text>
                    <Text variant="bodySm" tone="subdued">ID / Slug</Text>
                  </InlineStack>
                  {categories.length === 0 && (
                    <Text tone="subdued">No categories yet. Click "Add category" to get started.</Text>
                  )}
                  {categories.map((cat, i) => (
                    <CategoryRow
                      key={cat.id + i}
                      cat={cat}
                      onChange={(updated) =>
                        setCategories((prev) => prev.map((c, idx) => (idx === i ? updated : c)))
                      }
                      onDelete={() => setCategories((prev) => prev.filter((_, idx) => idx !== i))}
                      onMoveUp={() => moveItem(categories, setCategories, i, -1)}
                      onMoveDown={() => moveItem(categories, setCategories, i, 1)}
                      isFirst={i === 0}
                      isLast={i === categories.length - 1}
                    />
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Dietary Filters */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h2">Dietary Filters</Text>
                    <Text variant="bodySm" tone="subdued">
                      Toggle buttons shown in the dietary section. Use "Without X" phrasing for exclusion-based filtering.
                    </Text>
                  </BlockStack>
                  <Button onClick={addDietary}>Add filter</Button>
                </InlineStack>
                <Divider />
                <BlockStack gap="200">
                  <InlineStack gap="200">
                    <Text variant="bodySm" tone="subdued">Icon</Text>
                    <Text variant="bodySm" tone="subdued">Label</Text>
                    <Text variant="bodySm" tone="subdued">ID / Slug</Text>
                  </InlineStack>
                  {dietary.length === 0 && (
                    <Text tone="subdued">No dietary filters yet. Click "Add filter" to get started.</Text>
                  )}
                  {dietary.map((d, i) => (
                    <DietaryRow
                      key={d.id + i}
                      filter={d}
                      onChange={(updated) =>
                        setDietary((prev) => prev.map((f, idx) => (idx === i ? updated : f)))
                      }
                      onDelete={() => setDietary((prev) => prev.filter((_, idx) => idx !== i))}
                      onMoveUp={() => moveItem(dietary, setDietary, i, -1)}
                      onMoveDown={() => moveItem(dietary, setDietary, i, 1)}
                      isFirst={i === 0}
                      isLast={i === dietary.length - 1}
                    />
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {toastMsg && <Toast content={toastMsg} onDismiss={() => setToastMsg("")} />}
      </Page>
    </Frame>
  );
}
