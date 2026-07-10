import { PrismaService } from "./src/prisma/prisma.service";
import { CRMService } from "./src/crm/crm.service";
import { LeadStatus, LeadPriority, ActivityType, OpportunityStage } from "@prisma/client";

const prisma = new PrismaService();

async function runTest() {
  console.log("=== STARTING CRM FLOW INTEGRATION TEST ===");

  const crmService = new CRMService(prisma);

  // 1. Create a Lead
  console.log("Testing Lead Creation...");
  const lead = await crmService.createLead({
    companyName: "Acme Corp Ltd",
    contactPerson: "John Doe",
    mobile: "+9647701234567",
    email: "john.doe@acme.com",
    country: "Iraq",
    city: "Baghdad",
    industry: "Technology",
    source: "Website Request",
    expectedValue: 12500.00,
    priority: LeadPriority.HIGH,
    notes: "Requires standard implementation package.",
  });

  console.log(`Lead created: ${lead.leadNumber}, ID: ${lead.id}, Company: ${lead.companyName}`);
  if (lead.status !== "NEW") throw new Error("Lead status should be NEW by default");

  // Verify timeline event exists
  const timeline = await prisma.leadTimeline.findMany({ where: { leadId: lead.id } });
  console.log(`Found ${timeline.length} timeline events. First: ${timeline[0]?.type}`);
  if (timeline.length === 0 || timeline[0]?.type !== "LEAD_CREATED") {
    throw new Error("Missing LEAD_CREATED timeline event");
  }

  // 2. Add an Activity
  console.log("Testing Activity scheduling...");
  const activity = await crmService.createActivity({
    leadId: lead.id,
    type: ActivityType.CALL,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
    notes: "Follow up call to qualify needs.",
  });
  console.log(`Scheduled activity: ID: ${activity.id}, Type: ${activity.type}`);

  // 3. Convert Lead to Opportunity
  console.log("Testing Lead conversion...");
  const opportunity = await crmService.convertLead(lead.id, {
    expectedRevenue: 15000.00,
    expectedClosingDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    probability: 60,
    stage: OpportunityStage.QUALIFICATION,
  });

  console.log(`Lead converted to Opportunity. Expected Revenue: ${opportunity.expectedRevenue}`);
  
  // Verify Lead status updated to WON
  const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
  if (updatedLead?.status !== LeadStatus.WON) {
    throw new Error(`Lead status is not WON after conversion: ${updatedLead?.status}`);
  }

  // 4. Update Opportunity stage
  console.log("Testing Opportunity update...");
  const updatedOpp = await crmService.updateOpportunity(opportunity.id, {
    stage: OpportunityStage.PROPOSAL,
    probability: 80,
    expectedRevenue: 15000.00,
  });
  console.log(`Opportunity Stage updated to: ${updatedOpp.stage}`);

  // 5. Test CRM Dashboard stats query
  console.log("Testing CRM Dashboard stats...");
  const dashboard = await crmService.getCRMDashboard();
  console.log(`Dashboard Stats: Total Leads: ${dashboard.totalLeads}, Won Deals: ${dashboard.wonDeals}, Pipeline: ${dashboard.pipelineValue}`);

  // 6. Clean up test records
  console.log("Cleaning up test data...");
  await prisma.activity.deleteMany({ where: { leadId: lead.id } });
  await prisma.opportunity.deleteMany({ where: { leadId: lead.id } });
  await prisma.leadTimeline.deleteMany({ where: { leadId: lead.id } });
  await prisma.lead.delete({ where: { id: lead.id } });

  console.log("=== CRM FLOW INTEGRATION TEST PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch(err => {
    console.error("CRM Test failed: ", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
