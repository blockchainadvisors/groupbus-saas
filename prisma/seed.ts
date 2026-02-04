import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create superadmin user
  const passwordHash = await bcrypt.hash("admin123!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@groupbus.co.uk" },
    update: {},
    create: {
      email: "admin@groupbus.co.uk",
      firstName: "System",
      lastName: "Admin",
      passwordHash,
      role: "SUPERADMIN",
      isActive: true,
    },
  });

  console.log(`Created admin user: ${admin.email}`);

  // Create default AI configuration
  const aiConfigs = [
    {
      key: "confidence_thresholds",
      value: {
        "email-parser": 0.75,
        "enquiry-analyzer": 0.60,
        "supplier-selector": 0.70,
        "bid-evaluator": 0.80,
        "markup-calculator": 0.70,
        "quote-content": 0.50,
        "job-documents": 0.50,
        "email-personalizer": 0.50,
      },
      description: "Confidence thresholds for AI tasks. Below threshold = escalate to human review.",
    },
    {
      key: "markup_bounds",
      value: {
        minPercent: 15,
        maxPercent: 35,
        defaultPercent: 22,
      },
      description: "Minimum and maximum markup percentages for customer quotes.",
    },
    {
      key: "supplier_selection_weights",
      value: {
        rating: 25,
        priceCompetitiveness: 20,
        reliability: 20,
        proximity: 15,
        responseTime: 10,
        fleetMatch: 10,
      },
      description: "Weights for supplier selection scoring criteria (must sum to 100).",
    },
    {
      key: "daily_cost_budget",
      value: {
        budgetUsd: 50,
        warningThresholdPercent: 80,
        pauseNonCriticalAt: 100,
      },
      description: "Daily AI cost budget in USD.",
    },
    {
      key: "pipeline_toggles",
      value: {
        "flow2:enquiry-intake": true,
        "flow3:bid-evaluation": true,
        "flow4:quote-generation": true,
        "flow6:job-confirmation": true,
      },
      description: "Enable/disable AI pipelines. Disabled pipelines require manual processing.",
    },
    {
      key: "bid_settings",
      value: {
        defaultDeadlineHours: 48,
        maxSuppliersToContact: 5,
        minBidsRequired: 2,
      },
      description: "Settings for supplier bid process.",
    },
  ];

  for (const config of aiConfigs) {
    await prisma.aiConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: {
        key: config.key,
        value: config.value,
        description: config.description,
        updatedBy: admin.id,
      },
    });
  }

  console.log(`Created ${aiConfigs.length} AI config entries`);

  // Create default system settings
  const settings = [
    { key: "company_name", value: "GroupBus" },
    { key: "company_email", value: "hello@groupbus.co.uk" },
    { key: "company_phone", value: "+44 (0) 800 123 4567" },
    { key: "company_address", value: "London, United Kingdom" },
    { key: "default_vat_rate", value: "20" },
    { key: "quote_validity_days", value: "7" },
    { key: "deposit_percentage", value: "25" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log(`Created ${settings.length} system settings`);

  // Initialize reference number sequences
  const sequences = [
    { prefix: "GB-ENQ", currentValue: 0 },
    { prefix: "GB-QUO", currentValue: 0 },
    { prefix: "GB-BKG", currentValue: 0 },
  ];

  for (const seq of sequences) {
    await prisma.sequence.upsert({
      where: { prefix_year: { prefix: seq.prefix, year: new Date().getFullYear() } },
      update: {},
      create: { ...seq, year: new Date().getFullYear() },
    });
  }

  console.log(`Created ${sequences.length} sequences`);

  // Create a sample supplier organisation
  const supplierOrg = await prisma.organisation.upsert({
    where: { id: "sample-supplier-org" },
    update: {},
    create: {
      id: "sample-supplier-org",
      name: "Demo Coach Hire Ltd",
      type: "SUPPLIER",
      email: "info@democoachhire.co.uk",
      phone: "+44 7700 900000",
      address: "123 Transport Way, London, SE1 1AA",
      isActive: true,
      rating: 4.5,
      totalJobsCompleted: 150,
      reliabilityScore: 97.5,
    },
  });

  // Create a supplier user
  const supplierPassword = await bcrypt.hash("supplier123!", 12);
  await prisma.user.upsert({
    where: { email: "supplier@democoachhire.co.uk" },
    update: {},
    create: {
      email: "supplier@democoachhire.co.uk",
      firstName: "John",
      lastName: "Driver",
      passwordHash: supplierPassword,
      role: "SUPPLIER",
      organisationId: supplierOrg.id,
      isActive: true,
    },
  });

  // Create sample vehicles for the supplier
  const vehicles = [
    { type: "STANDARD_COACH" as const, registrationNumber: "AB12 CDE", capacity: 53, make: "Volvo", model: "9700" },
    { type: "EXECUTIVE_COACH" as const, registrationNumber: "FG34 HIJ", capacity: 49, make: "Mercedes", model: "Tourismo" },
    { type: "MINIBUS" as const, registrationNumber: "KL56 MNO", capacity: 16, make: "Ford", model: "Transit" },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.create({
      data: {
        organisationId: supplierOrg.id,
        type: v.type,
        registrationNumber: v.registrationNumber,
        capacity: v.capacity,
        make: v.make,
        model: v.model,
        isActive: true,
      },
    });
  }

  console.log("Created sample supplier with vehicles");

  // Create a sample client user
  const clientPassword = await bcrypt.hash("client123!", 12);
  await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      email: "client@example.com",
      firstName: "Jane",
      lastName: "Smith",
      passwordHash: clientPassword,
      role: "CLIENT",
      isActive: true,
    },
  });

  console.log("Created sample client user");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
