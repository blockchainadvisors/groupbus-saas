import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function seedId(prefix: string, index: number): string {
  return `seed-${prefix}-${String(index).padStart(3, "0")}`;
}

function seedRef(prefix: string, year: number, index: number): string {
  return `${prefix}-${year}-${String(index).padStart(5, "0")}`;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return +(Math.random() * (max - min) + min).toFixed(2);
}

function addHours(date: Date, h: number): Date {
  return new Date(date.getTime() + h * 3600000);
}

function addDays(date: Date, d: number): Date {
  return new Date(date.getTime() + d * 86400000);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

type VehicleType =
  | "MINIBUS"
  | "STANDARD_COACH"
  | "EXECUTIVE_COACH"
  | "DOUBLE_DECKER"
  | "MIDI_COACH";
type TripType = "ONE_WAY" | "RETURN" | "MULTI_STOP";
type EnquiryStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "SENT_TO_SUPPLIERS"
  | "QUOTES_RECEIVED"
  | "QUOTE_SENT"
  | "ACCEPTED"
  | "CANCELLED"
  | "EXPIRED";
type BookingStatus =
  | "CONFIRMED"
  | "SUPPLIER_ASSIGNED"
  | "SUPPLIER_ACCEPTED"
  | "SUPPLIER_REJECTED"
  | "PRE_TRIP_READY"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
type AiTaskType =
  | "EMAIL_PARSER"
  | "ENQUIRY_ANALYZER"
  | "SUPPLIER_SELECTOR"
  | "BID_EVALUATOR"
  | "MARKUP_CALCULATOR"
  | "QUOTE_CONTENT"
  | "JOB_DOCUMENTS"
  | "EMAIL_PERSONALIZER";
type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED";

const ENQUIRY_STATUS_ORDER: EnquiryStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "SENT_TO_SUPPLIERS",
  "QUOTES_RECEIVED",
  "QUOTE_SENT",
  "ACCEPTED",
];

const BOOKING_STATUS_ORDER: BookingStatus[] = [
  "CONFIRMED",
  "SUPPLIER_ASSIGNED",
  "SUPPLIER_ACCEPTED",
  "PRE_TRIP_READY",
  "IN_PROGRESS",
  "COMPLETED",
];

function generatePrice(vehicleType: VehicleType, tripType: TripType): number {
  const base: Record<VehicleType, [number, number]> = {
    MINIBUS: [200, 600],
    STANDARD_COACH: [450, 1500],
    EXECUTIVE_COACH: [700, 2500],
    DOUBLE_DECKER: [600, 2000],
    MIDI_COACH: [350, 1000],
  };
  const [lo, hi] = base[vehicleType] ?? [300, 1200];
  let price = randomFloat(lo, hi);
  if (tripType === "RETURN") price *= 1.6;
  if (tripType === "MULTI_STOP") price *= 2.0;
  return +price.toFixed(2);
}

function applyMarkup(supplierPrice: number, markupPct: number) {
  const markupAmount = +(supplierPrice * (markupPct / 100)).toFixed(2);
  const subtotal = +(supplierPrice + markupAmount).toFixed(2);
  const vatRate = 20;
  const vatAmount = +(subtotal * (vatRate / 100)).toFixed(2);
  const totalPrice = +(subtotal + vatAmount).toFixed(2);
  return { markupAmount, subtotal, vatRate, vatAmount, totalPrice };
}

function getBookingStatusChain(terminal: BookingStatus): BookingStatus[] {
  if (terminal === "CANCELLED") {
    const cancelAt = randomInt(0, 3);
    return [
      ...BOOKING_STATUS_ORDER.slice(0, cancelAt + 1),
      "CANCELLED",
    ];
  }
  if (terminal === "SUPPLIER_REJECTED") {
    return ["CONFIRMED", "SUPPLIER_ASSIGNED", "SUPPLIER_REJECTED"];
  }
  const idx = BOOKING_STATUS_ORDER.indexOf(terminal);
  if (idx === -1) return [terminal];
  return BOOKING_STATUS_ORDER.slice(0, idx + 1);
}

function pickPaymentStatus(): PaymentStatus {
  const r = Math.random();
  if (r < 0.72) return "SUCCEEDED";
  if (r < 0.88) return "PENDING";
  return "FAILED";
}

// ═══════════════════════════════════════════════════════════════════════════════
// UK Data Constants
// ═══════════════════════════════════════════════════════════════════════════════

const UK_LOCATIONS = [
  { name: "London Victoria Coach Station", lat: 51.4952, lng: -0.1439 },
  { name: "Birmingham Coach Station", lat: 52.4774, lng: -1.8983 },
  { name: "Manchester Piccadilly", lat: 53.4774, lng: -2.2309 },
  { name: "Edinburgh Bus Station", lat: 55.9533, lng: -3.1883 },
  { name: "Leeds City Centre", lat: 53.7997, lng: -1.5492 },
  { name: "Bristol Temple Meads", lat: 51.4494, lng: -2.5813 },
  { name: "Liverpool Lime Street", lat: 53.4076, lng: -2.9774 },
  { name: "Glasgow Buchanan Bus Station", lat: 55.8642, lng: -4.2518 },
  { name: "Cardiff Central", lat: 51.4752, lng: -3.179 },
  { name: "Sheffield Interchange", lat: 53.3811, lng: -1.4701 },
  { name: "Newcastle Central Station", lat: 54.9687, lng: -1.6175 },
  { name: "Nottingham Station", lat: 52.9471, lng: -1.1467 },
  { name: "Brighton Churchill Square", lat: 50.8225, lng: -0.1372 },
  { name: "Oxford Gloucester Green", lat: 51.7542, lng: -1.2618 },
  { name: "Cambridge Parkside", lat: 52.2053, lng: 0.1218 },
  { name: "York Station", lat: 53.959, lng: -1.0928 },
  { name: "Bath Spa Station", lat: 51.3781, lng: -2.3597 },
  { name: "Exeter St Davids", lat: 50.7277, lng: -3.5421 },
  { name: "Aberdeen Union Square", lat: 57.1437, lng: -2.0986 },
  { name: "Coventry Pool Meadow", lat: 52.4072, lng: -1.5028 },
] as const;

const FIRST_NAMES = [
  "James","Oliver","William","Harry","George","Thomas","Jack","Charlie",
  "Jacob","Alfie","Emma","Olivia","Sophie","Amelia","Charlotte","Emily",
  "Isabella","Mia","Ava","Grace",
] as const;

const LAST_NAMES = [
  "Smith","Jones","Williams","Taylor","Brown","Davies","Wilson","Evans",
  "Thomas","Johnson","Roberts","Walker","Robinson","Thompson","Wright",
  "White","Edwards","Hughes","Green","Hall",
] as const;

const SUPPLIER_ORGS = [
  { name: "Britannia Coach Hire", city: "London", postcode: "SE1 1AA", address: "42 Lambeth Road, London", email: "info@britanniacoaches.co.uk", phone: "+44 20 7946 0958", rating: 4.7, reliability: 96.5, jobs: 180 },
  { name: "Midlands Express Travel", city: "Birmingham", postcode: "B5 4BU", address: "18 Digbeth High Street, Birmingham", email: "bookings@midlandsexpress.co.uk", phone: "+44 121 496 0123", rating: 4.3, reliability: 93.2, jobs: 120 },
  { name: "Northern Star Coaches", city: "Manchester", postcode: "M1 2PF", address: "7 Portland Street, Manchester", email: "ops@northernstar.co.uk", phone: "+44 161 234 5678", rating: 4.5, reliability: 95.0, jobs: 145 },
  { name: "Highland Touring Co", city: "Edinburgh", postcode: "EH1 1RE", address: "3 St Andrew Square, Edinburgh", email: "tours@highlandtouring.co.uk", phone: "+44 131 225 4321", rating: 4.1, reliability: 91.8, jobs: 85 },
  { name: "Westway Travel Services", city: "Bristol", postcode: "BS1 6QF", address: "55 Broadmead, Bristol", email: "info@westway.co.uk", phone: "+44 117 929 8765", rating: 4.6, reliability: 94.7, jobs: 110 },
  { name: "Yorkshire Dales Coaches", city: "Leeds", postcode: "LS1 5PL", address: "12 The Headrow, Leeds", email: "hello@ydcoaches.co.uk", phone: "+44 113 245 9876", rating: 4.4, reliability: 92.1, jobs: 95 },
] as const;

const VEHICLE_SPECS: {
  type: VehicleType;
  make: string;
  model: string;
  capacity: number;
}[] = [
  { type: "MINIBUS", make: "Ford", model: "Transit", capacity: 16 },
  { type: "MINIBUS", make: "Mercedes-Benz", model: "Sprinter", capacity: 19 },
  { type: "MINIBUS", make: "Iveco", model: "Daily", capacity: 22 },
  { type: "STANDARD_COACH", make: "Volvo", model: "9700", capacity: 53 },
  { type: "STANDARD_COACH", make: "Scania", model: "Touring", capacity: 49 },
  { type: "STANDARD_COACH", make: "Mercedes-Benz", model: "Tourismo", capacity: 53 },
  { type: "STANDARD_COACH", make: "VDL", model: "Futura FHD2", capacity: 57 },
  { type: "EXECUTIVE_COACH", make: "Volvo", model: "9900", capacity: 49 },
  { type: "EXECUTIVE_COACH", make: "Mercedes-Benz", model: "Tourismo M", capacity: 44 },
  { type: "EXECUTIVE_COACH", make: "Irizar", model: "i6S", capacity: 53 },
  { type: "DOUBLE_DECKER", make: "Van Hool", model: "TDX27", capacity: 81 },
  { type: "DOUBLE_DECKER", make: "Plaxton", model: "Panorama", capacity: 78 },
];

const VEHICLE_FEATURES = [
  "Air conditioning","WiFi","USB charging","PA system","Toilet",
  "DVD screens","Reclining seats","Tinted windows","Luggage compartment",
  "Wheelchair ramp",
];

const SPECIAL_REQUIREMENTS = [
  "Wheelchair access","Extra luggage space","WiFi required",
  "USB charging","Onboard toilet","Air conditioning","PA system",
  "Child seats","DBS checked driver",
];

const ADDITIONAL_NOTES = [
  "We need wheelchair access for 2 passengers.",
  "The group includes elderly passengers, comfortable coach preferred.",
  "Please ensure the driver is familiar with the route.",
  "We may need a stop at motorway services.",
  "Corporate event transport.",
  "School trip - DBS checked driver required.",
  "Wedding party - luxury vehicle preferred.",
  "Sports team - room for equipment needed.",
  "Airport transfer.",
  "University group outing.",
  null, null, null, null,
];

const COMPANY_NAMES = [
  "Acme Corp","Tech Solutions Ltd","British Manufacturing PLC",
  "London Events Co","ABC School Trust","National Sports Federation",
  "Greenfield Academy","Riverside Church","Metro Council",
  null, null, null, null, null,
];

const DRIVER_NAMES = [
  { first: "Dave", last: "Mitchell" },
  { first: "Steve", last: "Clarke" },
  { first: "Mike", last: "Patterson" },
  { first: "Gary", last: "Fletcher" },
  { first: "Paul", last: "Barker" },
  { first: "Kevin", last: "Shaw" },
  { first: "Martin", last: "Cooper" },
  { first: "Brian", last: "Reed" },
  { first: "Terry", last: "Watts" },
  { first: "Phil", last: "Barnes" },
  { first: "Ian", last: "Foster" },
  { first: "Mark", last: "Morris" },
  { first: "Alan", last: "Dixon" },
  { first: "Neil", last: "Harvey" },
  { first: "Keith", last: "Palmer" },
];

const AI_TASK_TYPES: AiTaskType[] = [
  "EMAIL_PARSER","ENQUIRY_ANALYZER","SUPPLIER_SELECTOR","BID_EVALUATOR",
  "MARKUP_CALCULATOR","QUOTE_CONTENT","JOB_DOCUMENTS","EMAIL_PERSONALIZER",
];

const TRIP_TYPES: TripType[] = ["ONE_WAY", "RETURN", "MULTI_STOP"];
const VEHICLE_TYPES: VehicleType[] = [
  "MINIBUS","STANDARD_COACH","EXECUTIVE_COACH","DOUBLE_DECKER","MIDI_COACH",
];

const MONTHLY_COUNTS = [18, 20, 22, 25, 27, 28, 30, 32, 33, 35, 40, 50];

const BOOKING_STATUS_POOL: BookingStatus[] = [
  // Ordered: oldest accepted enquiries get most-progressed statuses
  ...Array<BookingStatus>(16).fill("COMPLETED"),
  ...Array<BookingStatus>(4).fill("CANCELLED"),
  ...Array<BookingStatus>(3).fill("SUPPLIER_REJECTED"),
  ...Array<BookingStatus>(2).fill("IN_PROGRESS"),
  ...Array<BookingStatus>(2).fill("PRE_TRIP_READY"),
  ...Array<BookingStatus>(4).fill("SUPPLIER_ACCEPTED"),
  ...Array<BookingStatus>(4).fill("SUPPLIER_ASSIGNED"),
  ...Array<BookingStatus>(5).fill("CONFIRMED"),
];

function regPlate(index: number): string {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const a1 = letters[index % letters.length];
  const a2 = letters[(index * 7 + 3) % letters.length];
  const age = ["21", "22", "23", "24", "71", "72", "73", "74"][index % 8];
  const r1 = letters[(index * 3 + 5) % letters.length];
  const r2 = letters[(index * 11 + 1) % letters.length];
  const r3 = letters[(index * 13 + 7) % letters.length];
  return `${a1}${a2}${age} ${r1}${r2}${r3}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const now = new Date();
  console.log("Seeding database...\n");

  // ─── Phase 1: Foundation (upserts — preserved) ─────────────────────────────

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
  console.log(`  Admin user: ${admin.email}`);

  const aiConfigs = [
    {
      key: "confidence_thresholds",
      value: {
        "email-parser": 0.75,
        "enquiry-analyzer": 0.6,
        "supplier-selector": 0.7,
        "bid-evaluator": 0.8,
        "markup-calculator": 0.7,
        "quote-content": 0.5,
        "job-documents": 0.5,
        "email-personalizer": 0.5,
      },
      description:
        "Confidence thresholds for AI tasks. Below threshold = escalate to human review.",
    },
    {
      key: "markup_bounds",
      value: { minPercent: 15, maxPercent: 35, defaultPercent: 22 },
      description:
        "Minimum and maximum markup percentages for customer quotes.",
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
      description:
        "Weights for supplier selection scoring criteria (must sum to 100).",
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
      description:
        "Enable/disable AI pipelines. Disabled pipelines require manual processing.",
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
  console.log(`  AI configs: ${aiConfigs.length}`);

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
  console.log(`  Settings: ${settings.length}`);

  const currentYear = now.getFullYear();
  const prevYear = currentYear - 1;
  for (const prefix of ["GB-ENQ", "GB-QUO", "GB-BKG"]) {
    for (const yr of [prevYear, currentYear]) {
      await prisma.sequence.upsert({
        where: { prefix_year: { prefix, year: yr } },
        update: {},
        create: { prefix, year: yr, currentValue: 0 },
      });
    }
  }
  console.log(`  Sequences initialised`);

  // ─── Phase 2: Cleanup seed-* records ───────────────────────────────────────

  console.log("\n  Cleaning up previous seed data...");
  await prisma.surveyResponse.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.bookingStatusHistory.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.payment.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.booking.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.customerQuote.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.supplierQuote.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.supplierEnquiry.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.humanReviewTask.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.aiDecisionLog.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.aiCostRecord.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.enquiryStatusHistory.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.notification.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.auditLog.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.enquiry.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.inboundEmail.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.surveyTemplate.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.vehicle.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.driverProfile.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: "seed-" } } });
  await prisma.organisation.deleteMany({ where: { id: { startsWith: "seed-" } } });
  console.log("  Cleanup complete.");

  // ─── Phase 3: Base entities ────────────────────────────────────────────────

  // Organisations
  const orgIds: string[] = [];
  for (let i = 0; i < SUPPLIER_ORGS.length; i++) {
    const o = SUPPLIER_ORGS[i];
    const id = seedId("org", i);
    orgIds.push(id);
    await prisma.organisation.create({
      data: {
        id,
        name: o.name,
        type: "SUPPLIER",
        email: o.email,
        phone: o.phone,
        address: o.address,
        city: o.city,
        postcode: o.postcode,
        country: "United Kingdom",
        rating: o.rating,
        totalJobsCompleted: o.jobs,
        reliabilityScore: o.reliability,
        isActive: true,
      },
    });
  }
  console.log(`\n  Organisations: ${orgIds.length}`);

  // Admin users (2 extra)
  const adminHash = await bcrypt.hash("admin123!", 12);
  const adminUsers: { id: string; email: string }[] = [];
  const adminSpecs = [
    { first: "Sarah", last: "Mitchell", email: "sarah@groupbus.co.uk" },
    { first: "David", last: "Henderson", email: "david@groupbus.co.uk" },
  ];
  for (let i = 0; i < adminSpecs.length; i++) {
    const a = adminSpecs[i];
    const id = seedId("adm", i);
    adminUsers.push({ id, email: a.email });
    await prisma.user.create({
      data: {
        id,
        email: a.email,
        firstName: a.first,
        lastName: a.last,
        passwordHash: adminHash,
        role: "ADMIN",
        isActive: true,
      },
    });
  }
  console.log(`  Admin users: ${adminUsers.length}`);

  // Supplier users (1 per org)
  const supplierHash = await bcrypt.hash("supplier123!", 12);
  const supplierUsers: { id: string; orgId: string }[] = [];
  for (let i = 0; i < SUPPLIER_ORGS.length; i++) {
    const o = SUPPLIER_ORGS[i];
    const id = seedId("sup", i);
    supplierUsers.push({ id, orgId: orgIds[i] });
    await prisma.user.create({
      data: {
        id,
        email: `supplier${i + 1}@${o.email.split("@")[1]}`,
        firstName: pick(FIRST_NAMES),
        lastName: pick(LAST_NAMES),
        passwordHash: supplierHash,
        role: "SUPPLIER",
        organisationId: orgIds[i],
        isActive: true,
      },
    });
  }
  console.log(`  Supplier users: ${supplierUsers.length}`);

  // Client users (12)
  const clientHash = await bcrypt.hash("client123!", 12);
  const clientUsers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }[] = [];
  for (let i = 0; i < 12; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[i % LAST_NAMES.length];
    const id = seedId("cli", i);
    const email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;
    const phone = `+44 7700 90${String(i).padStart(4, "0")}`;
    clientUsers.push({ id, firstName: first, lastName: last, email, phone });
    await prisma.user.create({
      data: {
        id,
        email,
        firstName: first,
        lastName: last,
        phone,
        passwordHash: clientHash,
        role: "CLIENT",
        isActive: true,
      },
    });
  }
  console.log(`  Client users: ${clientUsers.length}`);

  // Vehicles (20 across 6 orgs)
  const vehicleIds: { id: string; orgId: string; type: VehicleType }[] = [];
  for (let i = 0; i < 20; i++) {
    const orgIdx = i % orgIds.length;
    const spec = VEHICLE_SPECS[i % VEHICLE_SPECS.length];
    const id = seedId("veh", i);
    vehicleIds.push({ id, orgId: orgIds[orgIdx], type: spec.type });
    const futureDate = addDays(now, randomInt(30, 365));
    await prisma.vehicle.create({
      data: {
        id,
        organisationId: orgIds[orgIdx],
        type: spec.type,
        registrationNumber: regPlate(i),
        make: spec.make,
        model: spec.model,
        capacity: spec.capacity,
        features: pickN(VEHICLE_FEATURES, randomInt(3, 6)),
        insuranceExpiry: futureDate,
        motExpiry: addDays(futureDate, randomInt(-60, 60)),
        isActive: true,
      },
    });
  }
  console.log(`  Vehicles: ${vehicleIds.length}`);

  // Drivers (15 across 6 orgs)
  const driverIds: { id: string; orgId: string }[] = [];
  for (let i = 0; i < DRIVER_NAMES.length; i++) {
    const d = DRIVER_NAMES[i];
    const orgIdx = i % orgIds.length;
    const id = seedId("drv", i);
    driverIds.push({ id, orgId: orgIds[orgIdx] });
    const futureDate = addDays(now, randomInt(60, 730));
    await prisma.driverProfile.create({
      data: {
        id,
        organisationId: orgIds[orgIdx],
        firstName: d.first,
        lastName: d.last,
        email: `${d.first.toLowerCase()}.${d.last.toLowerCase()}@${SUPPLIER_ORGS[orgIdx].email.split("@")[1]}`,
        phone: `+44 7${randomInt(100, 999)} ${randomInt(100000, 999999)}`,
        licenseNumber: `DRIVE${String(i).padStart(6, "0")}`,
        licenseExpiry: futureDate,
        cpcExpiry: addDays(futureDate, randomInt(-90, 90)),
        isActive: true,
      },
    });
  }
  console.log(`  Drivers: ${driverIds.length}`);

  // Survey templates (2)
  const surveyTemplateIds = [seedId("st", 0), seedId("st", 1)];
  await prisma.surveyTemplate.create({
    data: {
      id: surveyTemplateIds[0],
      name: "Customer Post-Trip Survey",
      type: "CUSTOMER_POST_TRIP",
      description: "Survey sent to customers after trip completion",
      questions: [
        { id: "q1", text: "How would you rate the overall experience?", type: "rating", min: 1, max: 5 },
        { id: "q2", text: "How was the vehicle condition?", type: "rating", min: 1, max: 5 },
        { id: "q3", text: "How was the driver?", type: "rating", min: 1, max: 5 },
        { id: "q4", text: "Would you recommend us?", type: "boolean" },
        { id: "q5", text: "Additional comments", type: "text" },
      ],
      isActive: true,
    },
  });
  await prisma.surveyTemplate.create({
    data: {
      id: surveyTemplateIds[1],
      name: "Supplier Post-Trip Feedback",
      type: "SUPPLIER_POST_TRIP",
      description: "Feedback collected from suppliers after trip completion",
      questions: [
        { id: "q1", text: "How was the client communication?", type: "rating", min: 1, max: 5 },
        { id: "q2", text: "Were trip details accurate?", type: "boolean" },
        { id: "q3", text: "Any issues during the trip?", type: "text" },
      ],
      isActive: true,
    },
  });
  console.log(`  Survey templates: 2`);

  // ─── Phase 4: Build enquiry specs ──────────────────────────────────────────

  // Create a shuffled pool of terminal statuses
  const statusPool: EnquiryStatus[] = [
    ...Array<EnquiryStatus>(10).fill("DRAFT"),
    ...Array<EnquiryStatus>(30).fill("SUBMITTED"),
    ...Array<EnquiryStatus>(20).fill("UNDER_REVIEW"),
    ...Array<EnquiryStatus>(80).fill("SENT_TO_SUPPLIERS"),
    ...Array<EnquiryStatus>(40).fill("QUOTES_RECEIVED"),
    ...Array<EnquiryStatus>(50).fill("QUOTE_SENT"),
    ...Array<EnquiryStatus>(40).fill("ACCEPTED"),
    ...Array<EnquiryStatus>(50).fill("CANCELLED"),
    ...Array<EnquiryStatus>(40).fill("EXPIRED"),
  ];
  statusPool.sort(() => Math.random() - 0.5);

  interface EnquirySpec {
    month: number;
    status: EnquiryStatus;
    createdAt: Date;
  }
  const enquirySpecs: EnquirySpec[] = [];
  let poolIdx = 0;
  for (let month = 0; month < 12; month++) {
    // month 0 = 11 months ago, month 11 = current
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 11 + month,
      1
    );
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() - 11 + month + 1,
      0,
      23,
      59,
      59
    );
    for (let i = 0; i < MONTHLY_COUNTS[month]; i++) {
      enquirySpecs.push({
        month,
        status: statusPool[poolIdx++],
        createdAt: randomDate(monthStart, monthEnd),
      });
    }
  }
  // Sort within each month by date for chronological consistency
  enquirySpecs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  console.log(`\n  Building pipeline for ${enquirySpecs.length} enquiries...`);

  // ─── Phase 5: Main enquiry pipeline loop ───────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batch: Record<string, any[]> = {
    inboundEmails: [],
    enquiries: [],
    enquiryStatusHistory: [],
    supplierEnquiries: [],
    supplierQuotes: [],
    customerQuotes: [],
    bookings: [],
    bookingStatusHistory: [],
    payments: [],
    aiDecisionLogs: [],
    humanReviewTasks: [],
    notifications: [],
    auditLogs: [],
    surveyResponses: [],
  };

  // Counters for seed IDs and reference numbers
  let emailCtr = 0;
  let eshCtr = 0;
  let seCtr = 0;
  let sqCtr = 0;
  let cqCtr = 0;
  let bkgCtr = 0;
  let bshCtr = 0;
  let payCtr = 0;
  let aiCtr = 0;
  let hrtCtr = 0;
  let ntfCtr = 0;
  let audCtr = 0;
  let srCtr = 0;
  let bookingStatusIdx = 0;

  // Ref number counters per year — initialise from existing DB sequences
  // to avoid conflicts with non-seed records
  const enqRefCtr: Record<number, number> = {};
  const quoRefCtr: Record<number, number> = {};
  const bkgRefCtr: Record<number, number> = {};

  const existingSeqs = await prisma.sequence.findMany();
  for (const seq of existingSeqs) {
    if (seq.prefix === "GB-ENQ") enqRefCtr[seq.year] = seq.currentValue;
    if (seq.prefix === "GB-QUO") quoRefCtr[seq.year] = seq.currentValue;
    if (seq.prefix === "GB-BKG") bkgRefCtr[seq.year] = seq.currentValue;
  }

  function nextRef(
    prefix: string,
    year: number,
    ctrMap: Record<number, number>
  ): string {
    ctrMap[year] = (ctrMap[year] || 0) + 1;
    return seedRef(prefix, year, ctrMap[year]);
  }

  // Confidence thresholds per task type (must match AI config)
  const THRESHOLDS: Record<AiTaskType, number> = {
    EMAIL_PARSER: 0.75,
    ENQUIRY_ANALYZER: 0.6,
    SUPPLIER_SELECTOR: 0.7,
    BID_EVALUATOR: 0.8,
    MARKUP_CALCULATOR: 0.7,
    QUOTE_CONTENT: 0.5,
    JOB_DOCUMENTS: 0.5,
    EMAIL_PERSONALIZER: 0.5,
  };

  function makeAiLog(
    taskType: AiTaskType,
    enquiryId: string,
    logTime: Date,
    extraParsed: Record<string, unknown> = {}
  ) {
    // Bias toward higher confidence (~75% above threshold)
    const confidence = randomFloat(
      Math.random() < 0.75 ? THRESHOLDS[taskType] : 0.3,
      0.99
    );
    const threshold = THRESHOLDS[taskType];
    const autoExecuted = confidence >= threshold;
    const actionTaken = autoExecuted
      ? "AUTO_EXECUTED"
      : Math.random() < 0.04
        ? "OVERRIDDEN"
        : "ESCALATED_TO_HUMAN";
    const promptTokens = randomInt(300, 3000);
    const completionTokens = randomInt(100, 1500);
    const id = seedId("aidl", aiCtr++);

    batch.aiDecisionLogs.push({
      id,
      createdAt: logTime,
      taskType,
      enquiryId,
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      promptVersion: "v2.1",
      promptMessages: [
        { role: "system", content: `You are the ${taskType} agent.` },
        { role: "user", content: `Process enquiry ${enquiryId}` },
      ],
      rawResponse: { ok: true },
      parsedOutput: { taskType, result: "processed", ...extraParsed },
      confidenceScore: confidence,
      autoExecuted,
      actionTaken,
      latencyMs: randomInt(600, 4000),
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd: randomFloat(0.005, 0.2),
    });

    // Escalated → HumanReviewTask (cap at ~50 total)
    if (actionTaken === "ESCALATED_TO_HUMAN" && hrtCtr < 55) {
      const resolved = Math.random() < 0.7;
      batch.humanReviewTasks.push({
        id: seedId("hrt", hrtCtr++),
        createdAt: addHours(logTime, 0.1),
        updatedAt: resolved ? addHours(logTime, randomFloat(1, 72)) : logTime,
        taskType,
        enquiryId,
        reason:
          confidence < 0.4
            ? "LOW_CONFIDENCE"
            : pick(["LOW_CONFIDENCE", "POLICY_ESCALATION", "AI_FAILURE"]),
        context: { confidence, aiLogId: id },
        status: resolved ? "RESOLVED" : "PENDING",
        resolvedBy: resolved ? admin.id : null,
        resolvedAt: resolved ? addHours(logTime, randomFloat(1, 72)) : null,
        resolution: resolved ? { action: "approved", notes: "Verified by admin" } : null,
        aiDecisionLogId: id,
      });
    }

    return id;
  }

  for (let i = 0; i < enquirySpecs.length; i++) {
    const spec = enquirySpecs[i];
    const enqId = seedId("enq", i);
    const year = spec.createdAt.getFullYear();
    const customer = clientUsers[i % clientUsers.length];
    const pickup = UK_LOCATIONS[i % UK_LOCATIONS.length];
    const dropoff =
      UK_LOCATIONS[(i + randomInt(1, UK_LOCATIONS.length - 1)) % UK_LOCATIONS.length];
    const tripType = pick(TRIP_TYPES);
    const vehicleType = pick(VEHICLE_TYPES);
    const passengerCount = randomInt(8, 75);

    // Determine what pipeline stage this enquiry actually reached
    let reachedStage: EnquiryStatus;
    let cancelStage: EnquiryStatus | null = null;

    if (spec.status === "CANCELLED") {
      const stages: EnquiryStatus[] = [
        "SUBMITTED",
        "UNDER_REVIEW",
        "SENT_TO_SUPPLIERS",
        "QUOTES_RECEIVED",
        "QUOTE_SENT",
      ];
      cancelStage = pick(stages);
      reachedStage = cancelStage;
    } else if (spec.status === "EXPIRED") {
      const stages: EnquiryStatus[] = [
        "SENT_TO_SUPPLIERS",
        "QUOTES_RECEIVED",
        "QUOTE_SENT",
      ];
      cancelStage = pick(stages);
      reachedStage = cancelStage;
    } else {
      reachedStage = spec.status;
    }

    const reachedIdx = ENQUIRY_STATUS_ORDER.indexOf(reachedStage);

    // Build status chain
    const statusChain: EnquiryStatus[] = ENQUIRY_STATUS_ORDER.slice(
      0,
      reachedIdx + 1
    );
    if (spec.status === "CANCELLED") statusChain.push("CANCELLED");
    if (spec.status === "EXPIRED") statusChain.push("EXPIRED");

    // InboundEmail (~20% = every 5th)
    let sourceEmailId: string | null = null;
    if (i % 5 === 0) {
      const emailId = seedId("email", emailCtr++);
      sourceEmailId = emailId;
      batch.inboundEmails.push({
        id: emailId,
        createdAt: addHours(spec.createdAt, -randomFloat(0.5, 2)),
        fromEmail: customer.email,
        fromName: `${customer.firstName} ${customer.lastName}`,
        subject: `Coach hire enquiry - ${pickup.name} to ${dropoff.name}`,
        body: `Hi,\n\nWe are looking for a ${vehicleType.toLowerCase().replace("_", " ")} for ${passengerCount} passengers from ${pickup.name} to ${dropoff.name}.\n\nPlease send us a quote.\n\nThanks,\n${customer.firstName} ${customer.lastName}`,
        receivedAt: addHours(spec.createdAt, -randomFloat(0.5, 2)),
        processed: true,
        processedAt: spec.createdAt,
      });
    }

    // Enquiry
    const departureDate = addDays(spec.createdAt, randomInt(7, 60));
    batch.enquiries.push({
      id: enqId,
      createdAt: spec.createdAt,
      updatedAt: spec.createdAt,
      referenceNumber: nextRef("GB-ENQ", year, enqRefCtr),
      source: sourceEmailId
        ? "EMAIL"
        : (pick(["WEBSITE", "WEBSITE", "WEBSITE", "PHONE"]) as string),
      sourceEmailId,
      status: spec.status,
      customerId: customer.id,
      pickupLocation: pickup.name,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLocation: dropoff.name,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      tripType,
      departureDate,
      departureTime: `${String(randomInt(6, 20)).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`,
      returnDate: tripType !== "ONE_WAY" ? addDays(departureDate, randomInt(1, 5)) : null,
      returnTime:
        tripType !== "ONE_WAY"
          ? `${String(randomInt(14, 22)).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`
          : null,
      passengerCount,
      vehicleType,
      specialRequirements: pickN(
        SPECIAL_REQUIREMENTS,
        randomInt(0, 3)
      ),
      budgetMin: reachedIdx >= 1 ? generatePrice(vehicleType, tripType) * 0.7 : null,
      budgetMax: reachedIdx >= 1 ? generatePrice(vehicleType, tripType) * 1.3 : null,
      additionalNotes: pick(ADDITIONAL_NOTES),
      contactName: `${customer.firstName} ${customer.lastName}`,
      contactEmail: customer.email,
      contactPhone: customer.phone,
      companyName: pick(COMPANY_NAMES),
      gdprConsent: true,
      aiComplexityScore: reachedIdx >= 2 ? randomFloat(0.2, 0.95) : null,
      aiSuggestedVehicle: reachedIdx >= 2 ? vehicleType : null,
      aiEstimatedPriceMin:
        reachedIdx >= 2 ? generatePrice(vehicleType, tripType) * 0.85 : null,
      aiEstimatedPriceMax:
        reachedIdx >= 2 ? generatePrice(vehicleType, tripType) * 1.15 : null,
      aiQualityScore: reachedIdx >= 2 ? randomFloat(0.5, 1.0) : null,
    });

    // EnquiryStatusHistory
    let histTime = spec.createdAt;
    for (let s = 0; s < statusChain.length; s++) {
      batch.enquiryStatusHistory.push({
        id: seedId("esh", eshCtr++),
        createdAt: histTime,
        enquiryId: enqId,
        fromStatus: s === 0 ? null : statusChain[s - 1],
        toStatus: statusChain[s],
        changedById: s === 0 ? null : admin.id,
        notes: s === 0 ? "Enquiry created" : null,
      });
      histTime = addHours(histTime, randomFloat(0.5, 12));
    }

    // AI log: EMAIL_PARSER (for email-sourced, ~60% of the time)
    if (sourceEmailId && Math.random() < 0.6) {
      makeAiLog("EMAIL_PARSER", enqId, addHours(spec.createdAt, randomFloat(0, 0.5)));
    }

    // AI log: ENQUIRY_ANALYZER (at UNDER_REVIEW, ~60%)
    if (reachedIdx >= 2 && Math.random() < 0.6) {
      makeAiLog("ENQUIRY_ANALYZER", enqId, addHours(spec.createdAt, randomFloat(0.5, 3)), {
        complexityScore: randomFloat(0.2, 0.95),
        suggestedVehicle: vehicleType,
      });
    }

    // ── SENT_TO_SUPPLIERS: SupplierEnquiry ──
    const selectedOrgs: string[] = [];
    const seIds: string[] = [];

    if (reachedIdx >= 3) {
      const supplierCount = 2;
      const chosen = pickN(orgIds, supplierCount);
      for (const orgId of chosen) {
        const seId = seedId("se", seCtr++);
        selectedOrgs.push(orgId);
        seIds.push(seId);
        const sentAt = addHours(spec.createdAt, randomFloat(1, 4));
        batch.supplierEnquiries.push({
          id: seId,
          createdAt: sentAt,
          updatedAt: sentAt,
          enquiryId: enqId,
          organisationId: orgId,
          accessToken: `seed-se-token-${seCtr}`,
          status: reachedIdx >= 4 ? "QUOTED" : "PENDING",
          aiRank: selectedOrgs.length,
          aiScore: randomFloat(60, 98),
          aiReasoning: "Selected based on proximity, rating, and fleet match.",
          emailSentAt: sentAt,
          viewedAt: Math.random() < 0.7 ? addHours(sentAt, randomFloat(0.5, 12)) : null,
          expiresAt: addHours(sentAt, 48),
        });
      }

      // AI logs: SUPPLIER_SELECTOR (~40%), EMAIL_PERSONALIZER (~30%)
      if (Math.random() < 0.4) {
        makeAiLog("SUPPLIER_SELECTOR", enqId, addHours(spec.createdAt, randomFloat(1, 3)), {
          selectedSuppliers: selectedOrgs.length,
        });
      }
      if (Math.random() < 0.3) {
        makeAiLog("EMAIL_PERSONALIZER", enqId, addHours(spec.createdAt, randomFloat(1.5, 4)));
      }
    }

    // ── QUOTES_RECEIVED: SupplierQuote ──
    const sqData: { id: string; orgId: string; price: number }[] = [];

    if (reachedIdx >= 4 && seIds.length > 0) {
      // Most suppliers respond
      const respondCount = Math.min(seIds.length, randomInt(1, seIds.length));
      for (let q = 0; q < respondCount; q++) {
        const sqId = seedId("sq", sqCtr++);
        const basePrice = generatePrice(vehicleType, tripType);
        const fuelSurcharge = +(basePrice * randomFloat(0.02, 0.08)).toFixed(2);
        const tollCharges = Math.random() < 0.3 ? randomFloat(5, 40) : 0;
        const totalPrice = +(basePrice + fuelSurcharge + tollCharges).toFixed(2);
        sqData.push({ id: sqId, orgId: selectedOrgs[q], price: totalPrice });

        const orgVehicles = vehicleIds.filter(
          (v) => v.orgId === selectedOrgs[q]
        );
        const offeredVehicle = orgVehicles.length > 0 ? pick(orgVehicles) : null;

        // Determine supplier quote status
        let sqStatus: string = "SUBMITTED";
        if (spec.status === "ACCEPTED" && q === 0) sqStatus = "ACCEPTED";
        else if (spec.status === "ACCEPTED" && q > 0) sqStatus = "REJECTED";
        else if (reachedIdx >= 5) sqStatus = q === 0 ? "UNDER_REVIEW" : "SUBMITTED";

        batch.supplierQuotes.push({
          id: sqId,
          createdAt: addHours(spec.createdAt, randomFloat(12, 72)),
          updatedAt: addHours(spec.createdAt, randomFloat(24, 96)),
          supplierEnquiryId: seIds[q],
          organisationId: selectedOrgs[q],
          basePrice,
          fuelSurcharge,
          tollCharges,
          parkingCharges: 0,
          otherCharges: 0,
          totalPrice,
          currency: "GBP",
          vehicleId: offeredVehicle?.id ?? null,
          vehicleOffered: offeredVehicle
            ? `${VEHICLE_SPECS.find((s) => s.type === offeredVehicle.type)?.make ?? ""} ${VEHICLE_SPECS.find((s) => s.type === offeredVehicle.type)?.model ?? ""}`
            : null,
          notes: pick([
            "Price includes driver and fuel.",
            "Available for this date. Confirmed.",
            "Can accommodate all passengers.",
            null,
          ]),
          validUntil: addDays(spec.createdAt, 7),
          status: sqStatus,
          aiFairnessScore: randomFloat(0.5, 1.0),
          aiRanking: q + 1,
          aiReasoning: q === 0 ? "Best value for money." : "Alternative option.",
          aiAnomalyFlag: Math.random() < 0.05,
        });
      }

      // AI log: BID_EVALUATOR (~40%)
      if (Math.random() < 0.4) {
        makeAiLog("BID_EVALUATOR", enqId, addHours(spec.createdAt, randomFloat(24, 72)), {
          bidsEvaluated: respondCount,
          bestBidOrg: selectedOrgs[0],
        });
      }
    }

    // ── QUOTE_SENT: CustomerQuote ──
    let customerQuoteId: string | null = null;
    let bestQuote = sqData.length > 0
      ? sqData.reduce((a, b) => (a.price < b.price ? a : b))
      : null;

    if (reachedIdx >= 5 && bestQuote) {
      const cqId = seedId("cq", cqCtr++);
      customerQuoteId = cqId;
      const markupPct = randomFloat(15, 35);
      const markup = applyMarkup(bestQuote.price, markupPct);
      const sentAt = addHours(spec.createdAt, randomFloat(24, 96));

      let cqStatus: string;
      if (spec.status === "ACCEPTED") cqStatus = "ACCEPTED";
      else if (spec.status === "EXPIRED" && cancelStage === "QUOTE_SENT")
        cqStatus = "EXPIRED";
      else cqStatus = "SENT_TO_CUSTOMER";

      batch.customerQuotes.push({
        id: cqId,
        createdAt: sentAt,
        updatedAt: sentAt,
        referenceNumber: nextRef("GB-QUO", year, quoRefCtr),
        enquiryId: enqId,
        supplierQuoteId: bestQuote.id,
        supplierPrice: bestQuote.price,
        markupPercentage: markupPct,
        markupAmount: markup.markupAmount,
        subtotal: markup.subtotal,
        vatRate: markup.vatRate,
        vatAmount: markup.vatAmount,
        totalPrice: markup.totalPrice,
        currency: "GBP",
        acceptanceToken: `seed-cq-token-${cqCtr}`,
        status: cqStatus,
        sentAt,
        respondedAt: cqStatus === "ACCEPTED" ? addHours(sentAt, randomFloat(2, 48)) : null,
        validUntil: addDays(sentAt, 7),
        aiMarkupReasoning: `Applied ${markupPct.toFixed(1)}% markup based on market analysis.`,
        aiAcceptanceProbability: randomFloat(0.4, 0.9),
        aiDescription: `Coach hire from ${pickup.name} to ${dropoff.name} for ${passengerCount} passengers.`,
        aiEmailBody: `Dear ${customer.firstName},\n\nPlease find your quote for coach hire attached.\n\nBest regards,\nGroupBus Team`,
      });

      // AI logs: MARKUP_CALCULATOR (~30%), QUOTE_CONTENT (~20%)
      if (Math.random() < 0.3) {
        makeAiLog("MARKUP_CALCULATOR", enqId, addHours(sentAt, -2), {
          markupPct,
          supplierPrice: bestQuote.price,
        });
      }
      if (Math.random() < 0.2) {
        makeAiLog("QUOTE_CONTENT", enqId, addHours(sentAt, -1));
      }
    }

    // ── ACCEPTED: Booking + Payment ──
    if (spec.status === "ACCEPTED" && customerQuoteId && bestQuote) {
      const bkgStatus = BOOKING_STATUS_POOL[bookingStatusIdx++] ?? "CONFIRMED";
      const bkgId = seedId("bkg", bkgCtr++);
      const bookingCreatedAt = addHours(spec.createdAt, randomFloat(48, 168));

      const orgDrivers = driverIds.filter((d) => d.orgId === bestQuote!.orgId);
      const orgVehicles = vehicleIds.filter((v) => v.orgId === bestQuote!.orgId);

      const isCompleted = bkgStatus === "COMPLETED";
      const isCancelled = bkgStatus === "CANCELLED";
      const completedAt = isCompleted
        ? addDays(departureDate, randomInt(0, 2))
        : null;

      batch.bookings.push({
        id: bkgId,
        createdAt: bookingCreatedAt,
        updatedAt: bookingCreatedAt,
        referenceNumber: nextRef("GB-BKG", year, bkgRefCtr),
        enquiryId: enqId,
        customerQuoteId,
        organisationId: bestQuote.orgId,
        status: bkgStatus,
        supplierAccessToken: `seed-bkg-token-${bkgCtr}`,
        vehicleId: orgVehicles.length > 0 ? pick(orgVehicles).id : null,
        driverId: orgDrivers.length > 0 ? pick(orgDrivers).id : null,
        completedAt,
        cancelledAt: isCancelled
          ? addDays(bookingCreatedAt, randomInt(1, 14))
          : null,
        cancellationReason: isCancelled
          ? pick([
              "Customer requested cancellation",
              "Supplier unavailable",
              "Vehicle breakdown",
            ])
          : null,
      });

      // BookingStatusHistory
      const bkgChain = getBookingStatusChain(bkgStatus);
      let bkgHistTime = bookingCreatedAt;
      for (let s = 0; s < bkgChain.length; s++) {
        batch.bookingStatusHistory.push({
          id: seedId("bsh", bshCtr++),
          createdAt: bkgHistTime,
          bookingId: bkgId,
          fromStatus: s === 0 ? null : bkgChain[s - 1],
          toStatus: bkgChain[s],
          changedById: admin.id,
        });
        bkgHistTime = addHours(bkgHistTime, randomFloat(2, 48));
      }

      // Payment (primary)
      const cqRecord = batch.customerQuotes[batch.customerQuotes.length - 1];
      const payStatus = pickPaymentStatus();
      batch.payments.push({
        id: seedId("pay", payCtr++),
        createdAt: bookingCreatedAt,
        updatedAt: bookingCreatedAt,
        bookingId: bkgId,
        customerQuoteId,
        stripeSessionId: `seed_cs_${payCtr}`,
        stripePaymentIntentId: `seed_pi_${payCtr}`,
        amount: cqRecord.totalPrice,
        currency: "GBP",
        status: payStatus,
        description: `Payment for booking ${batch.bookings[batch.bookings.length - 1].referenceNumber}`,
        refundedAmount: 0,
      });

      // Second payment (deposit/balance) for ~25% of bookings
      if (Math.random() < 0.25) {
        const depositAmount = +(cqRecord.totalPrice * 0.25).toFixed(2);
        batch.payments.push({
          id: seedId("pay", payCtr++),
          createdAt: addDays(bookingCreatedAt, -randomInt(1, 7)),
          updatedAt: addDays(bookingCreatedAt, -randomInt(1, 7)),
          bookingId: bkgId,
          customerQuoteId,
          stripeSessionId: `seed_cs_${payCtr}`,
          stripePaymentIntentId: `seed_pi_${payCtr}`,
          amount: depositAmount,
          currency: "GBP",
          status: "SUCCEEDED",
          description: "Deposit payment",
          refundedAmount: 0,
        });
      }

      // AI log: JOB_DOCUMENTS (~30%)
      if (Math.random() < 0.3) {
        makeAiLog("JOB_DOCUMENTS", enqId, addHours(bookingCreatedAt, randomFloat(1, 12)));
      }

      // Survey responses for COMPLETED bookings
      if (isCompleted && completedAt) {
        // Customer survey
        batch.surveyResponses.push({
          id: seedId("sr", srCtr++),
          createdAt: addDays(completedAt, randomInt(1, 5)),
          updatedAt: addDays(completedAt, randomInt(1, 5)),
          templateId: surveyTemplateIds[0],
          bookingId: bkgId,
          respondentId: customer.id,
          accessToken: `seed-sr-token-${srCtr}`,
          answers: {
            q1: randomInt(3, 5),
            q2: randomInt(3, 5),
            q3: randomInt(3, 5),
            q4: Math.random() < 0.85,
            q5: pick([
              "Great service!",
              "Very comfortable journey.",
              "Driver was excellent.",
              "Would use again.",
              null,
            ]),
          },
          overallRating: randomInt(3, 5),
          comments: pick([
            "Excellent experience overall.",
            "Good value for money.",
            "Very professional service.",
            null,
          ]),
          completedAt: addDays(completedAt, randomInt(1, 5)),
        });
      }
    }

    // ── Notifications ──
    if (spec.status !== "DRAFT" && Math.random() < 0.8) {
      batch.notifications.push({
        id: seedId("ntf", ntfCtr++),
        createdAt: addHours(spec.createdAt, randomFloat(0, 1)),
        updatedAt: addHours(spec.createdAt, randomFloat(0, 1)),
        userId: customer.id,
        title: `Enquiry ${spec.status === "ACCEPTED" ? "Accepted" : "Update"}`,
        message: `Your enquiry for ${pickup.name} to ${dropoff.name} is now ${spec.status.toLowerCase().replace("_", " ")}.`,
        channel: pick(["IN_APP", "IN_APP", "EMAIL", "BOTH"]) as string,
        status: pick(["SENT", "SENT", "SENT", "READ"]) as string,
        readAt: Math.random() < 0.4 ? addHours(spec.createdAt, randomFloat(1, 48)) : null,
        sentAt: addHours(spec.createdAt, randomFloat(0, 1)),
      });
    }

    // ── AuditLog ──
    batch.auditLogs.push({
      id: seedId("aud", audCtr++),
      createdAt: spec.createdAt,
      action: "ENQUIRY_CREATED",
      entityType: "Enquiry",
      entityId: enqId,
      actorId: customer.id,
      changes: { status: statusChain[0] },
    });
    if (spec.status === "ACCEPTED") {
      batch.auditLogs.push({
        id: seedId("aud", audCtr++),
        createdAt: addHours(spec.createdAt, randomFloat(48, 168)),
        action: "BOOKING_CREATED",
        entityType: "Booking",
        entityId: seedId("bkg", bkgCtr - 1),
        actorId: admin.id,
        changes: { status: "CONFIRMED" },
      });
    }
  }

  // ─── Phase 6: Bulk insert in FK order ──────────────────────────────────────

  console.log("\n  Inserting records...");

  if (batch.inboundEmails.length > 0) {
    await prisma.inboundEmail.createMany({ data: batch.inboundEmails });
    console.log(`    InboundEmails: ${batch.inboundEmails.length}`);
  }

  await prisma.enquiry.createMany({ data: batch.enquiries });
  console.log(`    Enquiries: ${batch.enquiries.length}`);

  await prisma.enquiryStatusHistory.createMany({
    data: batch.enquiryStatusHistory,
  });
  console.log(
    `    EnquiryStatusHistory: ${batch.enquiryStatusHistory.length}`
  );

  if (batch.supplierEnquiries.length > 0) {
    await prisma.supplierEnquiry.createMany({
      data: batch.supplierEnquiries,
    });
    console.log(`    SupplierEnquiries: ${batch.supplierEnquiries.length}`);
  }

  if (batch.supplierQuotes.length > 0) {
    await prisma.supplierQuote.createMany({ data: batch.supplierQuotes });
    console.log(`    SupplierQuotes: ${batch.supplierQuotes.length}`);
  }

  if (batch.customerQuotes.length > 0) {
    await prisma.customerQuote.createMany({ data: batch.customerQuotes });
    console.log(`    CustomerQuotes: ${batch.customerQuotes.length}`);
  }

  if (batch.bookings.length > 0) {
    await prisma.booking.createMany({ data: batch.bookings });
    console.log(`    Bookings: ${batch.bookings.length}`);
  }

  if (batch.bookingStatusHistory.length > 0) {
    await prisma.bookingStatusHistory.createMany({
      data: batch.bookingStatusHistory,
    });
    console.log(
      `    BookingStatusHistory: ${batch.bookingStatusHistory.length}`
    );
  }

  if (batch.payments.length > 0) {
    await prisma.payment.createMany({ data: batch.payments });
    console.log(`    Payments: ${batch.payments.length}`);
  }

  if (batch.aiDecisionLogs.length > 0) {
    await prisma.aiDecisionLog.createMany({ data: batch.aiDecisionLogs });
    console.log(`    AiDecisionLogs: ${batch.aiDecisionLogs.length}`);
  }

  if (batch.humanReviewTasks.length > 0) {
    await prisma.humanReviewTask.createMany({
      data: batch.humanReviewTasks,
    });
    console.log(`    HumanReviewTasks: ${batch.humanReviewTasks.length}`);
  }

  if (batch.notifications.length > 0) {
    await prisma.notification.createMany({ data: batch.notifications });
    console.log(`    Notifications: ${batch.notifications.length}`);
  }

  if (batch.auditLogs.length > 0) {
    await prisma.auditLog.createMany({ data: batch.auditLogs });
    console.log(`    AuditLogs: ${batch.auditLogs.length}`);
  }

  if (batch.surveyResponses.length > 0) {
    await prisma.surveyResponse.createMany({ data: batch.surveyResponses });
    console.log(`    SurveyResponses: ${batch.surveyResponses.length}`);
  }

  // ─── Phase 7: AI cost records (3/day x 365 days) ──────────────────────────

  console.log("\n  Generating AI cost records...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiCostRecords: any[] = [];
  for (let day = 0; day < 365; day++) {
    const date = addDays(now, -364 + day);
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    for (let j = 0; j < 3; j++) {
      const taskType = pick(AI_TASK_TYPES);
      const promptTokens = randomInt(200, 4000);
      const completionTokens = randomInt(80, 1500);
      aiCostRecords.push({
        id: seedId("acr", day * 3 + j),
        createdAt: addHours(dayStart, randomFloat(8, 20)),
        date: dayStart,
        taskType,
        provider: "anthropic",
        model: pick(["claude-sonnet-4-20250514", "claude-haiku-4-20250414"]),
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCostUsd: randomFloat(0.003, 0.18),
      });
    }
  }
  await prisma.aiCostRecord.createMany({ data: aiCostRecords });
  console.log(`    AiCostRecords: ${aiCostRecords.length}`);

  // ─── Phase 8: Update sequence counters ─────────────────────────────────────

  console.log("\n  Updating sequence counters...");
  for (const [prefix, ctrMap] of [
    ["GB-ENQ", enqRefCtr],
    ["GB-QUO", quoRefCtr],
    ["GB-BKG", bkgRefCtr],
  ] as const) {
    for (const [yr, val] of Object.entries(ctrMap)) {
      await prisma.sequence.update({
        where: { prefix_year: { prefix, year: Number(yr) } },
        data: { currentValue: val as number },
      });
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log("\n  === Seed Summary ===");
  console.log(`  Organisations:        ${orgIds.length}`);
  console.log(`  Users (admin):        ${adminUsers.length + 1}`);
  console.log(`  Users (supplier):     ${supplierUsers.length}`);
  console.log(`  Users (client):       ${clientUsers.length}`);
  console.log(`  Vehicles:             ${vehicleIds.length}`);
  console.log(`  Drivers:              ${driverIds.length}`);
  console.log(`  Survey Templates:     2`);
  console.log(`  InboundEmails:        ${batch.inboundEmails.length}`);
  console.log(`  Enquiries:            ${batch.enquiries.length}`);
  console.log(`  EnquiryStatusHistory: ${batch.enquiryStatusHistory.length}`);
  console.log(`  SupplierEnquiries:    ${batch.supplierEnquiries.length}`);
  console.log(`  SupplierQuotes:       ${batch.supplierQuotes.length}`);
  console.log(`  CustomerQuotes:       ${batch.customerQuotes.length}`);
  console.log(`  Bookings:             ${batch.bookings.length}`);
  console.log(`  BookingStatusHistory: ${batch.bookingStatusHistory.length}`);
  console.log(`  Payments:             ${batch.payments.length}`);
  console.log(`  AiDecisionLogs:       ${batch.aiDecisionLogs.length}`);
  console.log(`  HumanReviewTasks:     ${batch.humanReviewTasks.length}`);
  console.log(`  Notifications:        ${batch.notifications.length}`);
  console.log(`  AuditLogs:            ${batch.auditLogs.length}`);
  console.log(`  SurveyResponses:      ${batch.surveyResponses.length}`);
  console.log(`  AiCostRecords:        ${aiCostRecords.length}`);
  console.log("\nSeed complete!");
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
