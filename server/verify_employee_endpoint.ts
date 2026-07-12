async function testEndpoint() {
  console.log("=== STARTING EMPLOYEE ENDPOINT ACCESS VERIFICATION ===");
  const baseUrl = "http://localhost:3001/api";

  const testCases = [
    { username: "admin", expectedStatus: 200, role: "SUPER_ADMIN" },
    { username: "admin2", expectedStatus: 200, role: "ADMIN" },
    { username: "hr_manager", expectedStatus: 200, role: "HR_MANAGER" },
    { username: "accountant2", expectedStatus: 200, role: "ACCOUNTANT" },
    { username: "sales1", expectedStatus: 403, role: "SALES_AGENT" },
    { username: "employee1", expectedStatus: 403, role: "EMPLOYEE" },
  ];

  let passed = true;

  for (const tc of testCases) {
    try {
      // 1. Log in to get the JWT token
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: tc.username,
          password: tc.username === "admin" ? "admin123" : "123456",
        }),
      });

      const loginData = await loginRes.json() as any;
      if (!loginRes.ok) {
        console.error(`❌ [LOGIN FAILED] ${tc.username}: ${loginData.message || "Unknown error"}`);
        passed = false;
        continue;
      }

      const token = loginData.token;

      // 2. Fetch employees using token
      const res = await fetch(`${baseUrl}/hrms/employees`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === tc.expectedStatus) {
        console.log(`✅ [PASS] User: ${tc.username} (${tc.role}) | Status: ${res.status} | Expected: ${tc.expectedStatus}`);
      } else {
        const bodyText = await res.text();
        console.error(`❌ [FAIL] User: ${tc.username} (${tc.role}) | Status: ${res.status} | Expected: ${tc.expectedStatus} | Body: ${bodyText}`);
        passed = false;
      }
    } catch (e: any) {
      console.error(`❌ [ERROR] User: ${tc.username} (${tc.role}): ${e.message}`);
      passed = false;
    }
  }

  console.log("--------------------------------------------------");
  if (passed) {
    console.log("🎉 All endpoint access verification checks PASSED successfully!");
    process.exit(0);
  } else {
    console.error("Some endpoint verification cases FAILED.");
    process.exit(1);
  }
}

testEndpoint();
