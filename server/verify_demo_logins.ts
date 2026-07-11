const USERNAMES = [
  "admin",
  "admin2",
  "hr_manager",
  "hr_employee1",
  "hr_employee2",
  "sales_manager",
  "sales1",
  "sales2",
  "sales3",
  "sales4",
  "sales5",
  "purchase_manager",
  "purchase1",
  "purchase2",
  "purchase3",
  "inventory_manager1",
  "inventory_manager2",
  "accountant1",
  "accountant2",
  "accountant3",
  "cashier1",
  "cashier2",
  "employee1",
  "employee2",
  "employee3",
  "employee4",
  "employee5",
  "employee6",
  "employee7",
  "employee8",
  "employee9",
  "employee10",
  "employee11",
  "employee12",
  "employee13",
  "employee14",
  "employee15",
];

async function verifyLogins() {
  console.log("=== STARTING DEMO ACCOUNTS LOGIN VERIFICATION ===");
  const baseUrl = "http://localhost:3001/api";
  let successCount = 0;
  let failCount = 0;

  for (const username of USERNAMES) {
    try {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: username,
          password: "123456",
        }),
      });

      const data = await response.json() as any;

      if (response.ok) {
        const { user } = data;
        console.log(`✅ [SUCCESS] User: ${username} | Role: ${user.role} | Permissions count: ${user.permissions?.length || 0}`);
        successCount++;
      } else {
        console.error(`❌ [FAILED] User: ${username} | Message: ${data.message || "Unknown error"}`);
        failCount++;
      }
    } catch (e: any) {
      console.error(`❌ [ERROR] User: ${username} | Message: ${e.message}`);
      failCount++;
    }
  }

  console.log("--------------------------------------------------");
  console.log(`Verification Summary:`);
  console.log(`Total Accounts Tested: ${USERNAMES.length}`);
  console.log(`Successful Logins: ${successCount}`);
  console.log(`Failed Logins: ${failCount}`);
  console.log("--------------------------------------------------");

  if (failCount > 0) {
    console.error("Some users failed to authenticate. Verification FAILED.");
    process.exit(1);
  } else {
    console.log("🎉 All demo user accounts authenticated successfully using password '123456'!");
  }
}

verifyLogins();
