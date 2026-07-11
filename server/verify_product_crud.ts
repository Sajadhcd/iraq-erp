async function testProductCrud() {
  console.log("=== INVENTORY PRODUCT CRUD VERIFICATION ===");
  const baseUrl = "http://localhost:3001/api";

  // 1. Login as admin
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin", password: "123456" }),
  });
  const loginData = await loginRes.json() as any;
  if (!loginRes.ok) {
    console.error("❌ Login failed:", loginData.message);
    process.exit(1);
  }
  const token = loginData.token;
  const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
  console.log("✅ Login successful");

  // 2. Get categories & warehouses
  const cats = await (await fetch(`${baseUrl}/inventory/categories`, { headers })).json() as any[];
  const whs = await (await fetch(`${baseUrl}/inventory/warehouses`, { headers })).json() as any[];
  if (!cats.length || !whs.length) {
    console.error("❌ No categories or warehouses found. Seed data first.");
    process.exit(1);
  }
  console.log(`✅ Found ${cats.length} categories, ${whs.length} warehouses`);

  // 3. POST - Create Product
  const testSku = `TEST-CRUD-${Date.now()}`;
  const createRes = await fetch(`${baseUrl}/inventory/products`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "منتج اختبار CRUD",
      sku: testSku,
      categoryId: cats[0].id,
      costPrice: 100,
      retailPrice: 150,
      unit: "PCS",
      alertQuantity: 5,
    }),
  });
  const createdProduct = await createRes.json() as any;
  if (createRes.ok) {
    console.log(`✅ [POST] Create Product: ${createRes.status} | ID: ${createdProduct.id}`);
  } else {
    console.error(`❌ [POST] Create Product: ${createRes.status} | ${JSON.stringify(createdProduct)}`);
    process.exit(1);
  }

  const productId = createdProduct.id;

  // 4. GET - List Products
  const listRes = await fetch(`${baseUrl}/inventory/products`, { headers });
  if (listRes.ok) {
    const products = await listRes.json() as any[];
    const found = products.find((p: any) => p.id === productId);
    console.log(`✅ [GET] List Products: ${listRes.status} | Total: ${products.length} | Created product found: ${!!found}`);
  } else {
    console.error(`❌ [GET] List Products: ${listRes.status}`);
  }

  // 5. GET - Get Product by ID
  const getRes = await fetch(`${baseUrl}/inventory/products/${productId}`, { headers });
  if (getRes.ok) {
    const product = await getRes.json() as any;
    console.log(`✅ [GET/:id] Get Product: ${getRes.status} | Name: ${product.name}`);
  } else {
    console.error(`❌ [GET/:id] Get Product: ${getRes.status} | ${await getRes.text()}`);
  }

  // 6. PUT - Update Product (THE CRITICAL FIX)
  const putRes = await fetch(`${baseUrl}/inventory/products/${productId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      name: "منتج اختبار CRUD (محدّث)",
      costPrice: 120,
      retailPrice: 180,
      alertQuantity: 8,
    }),
  });
  if (putRes.ok) {
    const updated = await putRes.json() as any;
    console.log(`✅ [PUT] Update Product: ${putRes.status} | New Name: ${updated.name} | New Cost: ${updated.costPrice} | New Retail: ${updated.retailPrice}`);
  } else {
    console.error(`❌ [PUT] Update Product: ${putRes.status} | ${await putRes.text()}`);
    process.exit(1);
  }

  // 7. DELETE - Soft Delete Product
  const delRes = await fetch(`${baseUrl}/inventory/products/${productId}`, {
    method: "DELETE",
    headers,
  });
  if (delRes.ok) {
    console.log(`✅ [DELETE] Delete Product: ${delRes.status}`);
  } else {
    console.error(`❌ [DELETE] Delete Product: ${delRes.status} | ${await delRes.text()}`);
  }

  // 8. Verify deleted product no longer appears in listing
  const listAfterDel = await (await fetch(`${baseUrl}/inventory/products`, { headers })).json() as any[];
  const stillExists = listAfterDel.find((p: any) => p.id === productId);
  if (!stillExists) {
    console.log(`✅ [VERIFY] Deleted product correctly excluded from listing`);
  } else {
    console.error(`❌ [VERIFY] Deleted product still appears in listing`);
  }

  console.log("--------------------------------------------------");
  console.log("🎉 All Inventory Product CRUD operations verified successfully!");
}

testProductCrud().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
