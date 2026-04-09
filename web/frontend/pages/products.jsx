import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Page, Layout, Card, Text, BlockStack, InlineStack, Badge, Button,
  Spinner, Box, Thumbnail, Checkbox, Divider, Banner, TextField,
  Modal, ChoiceList, Toast, Frame,
} from "@shopify/polaris";

export default function Products() {
  const navigate = useNavigate();
  const shop = new URLSearchParams(window.location.search).get("shop") || "";

  const [products, setProducts] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState(null);
  const [editCategories, setEditCategories] = useState([]);
  const [editDietary, setEditDietary] = useState([]);
  const [editPortions, setEditPortions] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    Promise.all([
      fetch(`/api/products?shop=${shop}`).then((r) => r.json()),
      fetch(`/api/config?shop=${shop}`).then((r) => r.json()),
      fetch(`/api/billing/status?shop=${shop}`).then((r) => r.json()),
    ]).then(([p, c, b]) => {
      setProducts(p.products || []);
      setConfig(c);
      setPlan(b.plan || "free");
    }).finally(() => setLoading(false));
  }, [shop]);

  const openEdit = useCallback((product) => {
    setEditProduct(product);
    setEditCategories(product.categories || []);
    setEditDietary(product.dietaryTags || []);
    setEditPortions(product.portionSizes || []);
  }, []);

  const saveProduct = useCallback(async () => {
    if (!editProduct) return;
    setSaving(true);
    try {
      const encodedId = encodeURIComponent(editProduct.id);
      await fetch(`/api/products/${encodedId}?shop=${shop}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productTitle: editProduct.title,
          categories: editCategories,
          dietaryTags: editDietary,
          portionSizes: editPortions,
        }),
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editProduct.id
            ? { ...p, categories: editCategories, dietaryTags: editDietary, portionSizes: editPortions }
            : p
        )
      );
      setToastMsg("Product saved");
      setEditProduct(null);
    } catch {
      setToastMsg("Failed to save product");
    } finally {
      setSaving(false);
    }
  }, [editProduct, editCategories, editDietary, editPortions, shop]);

  const filteredProducts = products.filter((p) =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase())
  );

  const allCategories = (config?.productCategories || []).filter((c) => c.active);
  const allDietary = (config?.dietaryFilters || []).filter((d) => d.active);

  if (loading) {
    return (
      <Page title="Products">
        <Layout><Layout.Section><Card><Box padding="800"><InlineStack align="center"><Spinner size="large" /></InlineStack></Box></Card></Layout.Section></Layout>
      </Page>
    );
  }

  return (
    <Frame>
      <Page
        title="Products"
        backAction={{ content: "Dashboard", onAction: () => navigate(`/?shop=${shop}`) }}
        primaryAction={{ content: "Configure Filters", onAction: () => navigate(`/filters?shop=${shop}`) }}
      >
        <Layout>
          {allCategories.length === 0 && allDietary.length === 0 && (
            <Layout.Section>
              <Banner
                title="No filters configured"
                tone="warning"
                action={{ content: "Configure filters", onAction: () => navigate(`/filters?shop=${shop}`) }}
              >
                You need to set up product categories and dietary filters before tagging products.
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text variant="headingMd" as="h2">
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
                    {plan === "free" && <Text as="span" tone="subdued"> (free plan: up to 20)</Text>}
                  </Text>
                </InlineStack>
                <TextField
                  label=""
                  labelHidden
                  placeholder="Search products..."
                  value={search}
                  onChange={setSearch}
                  clearButton
                  onClearButtonClick={() => setSearch("")}
                />
                <Divider />
                <BlockStack gap="300">
                  {filteredProducts.length === 0 && (
                    <Text tone="subdued">No products found.</Text>
                  )}
                  {filteredProducts.map((product) => {
                    const tagged = product.categories?.length > 0 || product.dietaryTags?.length > 0;
                    return (
                      <Box key={product.id} padding="300" borderWidth="025" borderRadius="200" borderColor="border">
                        <InlineStack align="space-between" blockAlign="start" wrap={false}>
                          <InlineStack gap="300" blockAlign="start" wrap={false}>
                            <Thumbnail
                              source={product.featuredImage?.url || "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_medium.png"}
                              alt={product.title}
                              size="small"
                            />
                            <BlockStack gap="100">
                              <Text variant="bodyMd" fontWeight="bold" as="span">{product.title}</Text>
                              <Text variant="bodySm" tone="subdued" as="span">
                                {product.productType || "No type"} • {product.variants?.length || 0} variant{product.variants?.length !== 1 ? "s" : ""}
                              </Text>
                              <InlineStack gap="150" wrap>
                                {product.categories?.length > 0 && product.categories.map((cat) => (
                                  <Badge key={cat} tone="info">{cat}</Badge>
                                ))}
                                {product.dietaryTags?.length > 0 && product.dietaryTags.map((tag) => (
                                  <Badge key={tag} tone="success">{tag}</Badge>
                                ))}
                                {!tagged && <Badge tone="attention">Not tagged</Badge>}
                              </InlineStack>
                            </BlockStack>
                          </InlineStack>
                          <Button size="slim" onClick={() => openEdit(product)}>Edit tags</Button>
                        </InlineStack>
                      </Box>
                    );
                  })}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Edit modal */}
        {editProduct && (
          <Modal
            open={!!editProduct}
            onClose={() => setEditProduct(null)}
            title={`Tag: ${editProduct.title}`}
            primaryAction={{ content: "Save", onAction: saveProduct, loading: saving }}
            secondaryActions={[{ content: "Cancel", onAction: () => setEditProduct(null) }]}
          >
            <Modal.Section>
              <BlockStack gap="400">
                {allCategories.length > 0 && (
                  <ChoiceList
                    title="Product Categories"
                    allowMultiple
                    choices={allCategories.map((c) => ({ label: `${c.emoji} ${c.label}`, value: c.id }))}
                    selected={editCategories}
                    onChange={setEditCategories}
                  />
                )}
                {allDietary.length > 0 && (
                  <>
                    <Divider />
                    <ChoiceList
                      title="Dietary Tags"
                      allowMultiple
                      choices={allDietary.map((d) => ({ label: d.label, value: d.id }))}
                      selected={editDietary}
                      onChange={setEditDietary}
                    />
                  </>
                )}
                {["starter", "pro", "enterprise"].includes(plan) && editProduct.variants?.length > 1 && (
                  <>
                    <Divider />
                    <Text variant="headingSm" as="h3">Portion Sizes</Text>
                    <Text variant="bodySm" tone="subdued">
                      Map variants to portion labels shown on the collection page.
                    </Text>
                    <BlockStack gap="200">
                      {editProduct.variants.map((v) => {
                        const portion = editPortions.find((p) => p.variantId === v.id);
                        return (
                          <InlineStack key={v.id} gap="200" blockAlign="center">
                            <Text variant="bodySm" as="span" fontWeight="semibold">{v.title}</Text>
                            <Text variant="bodySm" tone="subdued" as="span">£{v.price}</Text>
                            <TextField
                              label="Label"
                              labelHidden
                              placeholder="e.g. Serves 10"
                              value={portion?.label || ""}
                              onChange={(val) =>
                                setEditPortions((prev) => {
                                  const filtered = prev.filter((p) => p.variantId !== v.id);
                                  if (val) return [...filtered, { label: val, variantId: v.id, price: v.price }];
                                  return filtered;
                                })
                              }
                            />
                          </InlineStack>
                        );
                      })}
                    </BlockStack>
                  </>
                )}
              </BlockStack>
            </Modal.Section>
          </Modal>
        )}

        {toastMsg && (
          <Toast content={toastMsg} onDismiss={() => setToastMsg("")} />
        )}
      </Page>
    </Frame>
  );
}
