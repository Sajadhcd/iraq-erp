async function testQuotationsEndpoints() {
  console.log("=== STARTING CRM QUOTATIONS ENDPOINT ACCESS VERIFICATION ===");
  const baseUrl = "http://localhost:3001/api";

  const testCases = [
    { username: "admin", expectedStatus: 200, role: "SUPER_ADMIN" },
    { username: "admin2", expectedStatus: 200, role: "ADMIN" },
    { username: "sales_manager", expectedStatus: 200, role: "SALES_MANAGER" },
    { username: "sales1", expectedStatus: 200, role: "SALES_AGENT" },
    { username: "employee1", expectedStatus: 403, role: "EMPLOYEE" },
  ];

  let passed = true;

  for (const tc of testCases) {
    try {
      // 1. Log in
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: tc.username,
          password: "123456",
        }),
      });

      const loginData = await loginRes.json() as any;
      if (!loginRes.ok) {
        console.error(`❌ [LOGIN FAILED] ${tc.username}: ${loginData.message || "Unknown error"}`);
        passed = false;
        continue;
      }

      const token = loginData.token;

      // 2. Fetch /api/quotations
      const res1 = await fetch(`${baseUrl}/quotations`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res1.status === tc.expectedStatus) {
        console.log(`✅ [PASS] User: ${tc.username} (${tc.role}) | GET /api/quotations | Status: ${res1.status}`);
      } else {
        const bodyText = await res1.text();
        console.error(`❌ [FAIL] User: ${tc.username} (${tc.role}) | GET /api/quotations | Status: ${res1.status} | Expected: ${tc.expectedStatus} | Body: ${bodyText}`);
        passed = false;
      }

      // 3. Fetch /api/crm/quotations
      const res2 = await fetch(`${baseUrl}/crm/quotations`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res2.status === tc.expectedStatus) {
        console.log(`✅ [PASS] User: ${tc.username} (${tc.role}) | GET /api/crm/quotations | Status: ${res2.status}`);
      } else {
        const bodyText = await res2.text();
        console.error(`❌ [FAIL] User: ${tc.username} (${tc.role}) | GET /api/crm/quotations | Status: ${res2.status} | Expected: ${tc.expectedStatus} | Body: ${bodyText}`);
        passed = false;
      }
    } catch (e: any) {
      console.error(`❌ [ERROR] User: ${tc.username} (${tc.role}): ${e.message}`);
      passed = false;
    }
  }

  console.log("--------------------------------------------------");
  if (passed) {
    console.log("🎉 ALL QUOTATIONS ENDPOINTS PASSED E2E VERIFICATION!");
    process.exit(0);
  } else {
    console.error("❌ QUOTATIONS ENDPOINT VERIFICATION FAILED!");
    process.exit(1);
  }
}

testQuotationsEndpoints();
