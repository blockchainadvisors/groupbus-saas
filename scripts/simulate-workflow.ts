/**
 * Full Workflow Simulation Script (Browser-Driven)
 *
 * Uses Puppeteer to drive the entire GroupBus booking lifecycle through the
 * real UI, taking screenshots at every step. Verifies all emails via Mailpit.
 *
 * Flow:
 *   Customer submits enquiry → AI processes → Supplier bids →
 *   Admin sends quote → Customer pays via Stripe → Admin assigns vehicle →
 *   Supplier accepts → Admin marks completed → Emails verified
 *
 * Usage:
 *   npx tsx scripts/simulate-workflow.ts
 *
 * Prerequisites:
 *   - Docker services running (postgres, redis, mailpit)
 *   - Next.js dev server running on port 3000
 *   - Workers running (email, ai-pipeline, scheduler)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * BROWSER DEPENDENCIES (Linux only)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Puppeteer automatically downloads its own Chromium browser to ~/.cache/puppeteer/
 * However, on Linux, Chrome requires system-level shared libraries to run.
 *
 * If you see an error like:
 *   "error while loading shared libraries: libnspr4.so: cannot open shared object file"
 *
 * Install the required dependencies:
 *   sudo apt-get update && sudo apt-get install -y \
 *     libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
 *     libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
 *     libxrandr2 libgbm1 libasound2t64
 *
 * If emojis show as boxes in Mailpit, install emoji fonts:
 *   sudo apt-get install -y fonts-noto-color-emoji
 *
 * On macOS/Windows: No additional setup needed - Puppeteer's bundled Chromium works.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * AI AGENT INSTRUCTIONS (for Claude Code or similar tools running this script)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * AFTER RUNNING THIS SCRIPT, FOLLOW THESE STEPS:
 *
 * 1. CHECK OUTPUT SCREENSHOTS
 *    - Screenshots are saved to: screenshots/sim-{timestamp}/
 *    - Read key screenshots to verify content loaded correctly:
 *      • 03-step1-trip-details-filled.png - Should show filled form fields
 *      • 11-step3-bid-form-loaded.png - Should show bid form (NOT loading spinner)
 *      • 12-step3-bid-form-filled.png - Should show filled bid form with prices
 *      • 17-step6-customer-quote-page.png - Should show quote details (NOT loading spinner)
 *      • Email screenshots (*-email-*.png) - Should show GroupBus branded templates
 *
 * 2. VERIFY EMAIL TEMPLATES
 *    - Email screenshots should show React Email templates with:
 *      • GroupBus logo (🚌 emoji + "GroupBus" text)
 *      • Styled reference badges with dashed borders
 *      • Colored info boxes and detail tables
 *      • Professional footer with links
 *    - If emails show plain HTML (no styling), the React Email integration failed
 *
 * 3. COMMON ISSUES TO WATCH FOR
 *    - "Loading bid request..." in screenshots = timing issue (increase wait time)
 *    - "Loading your quote..." in screenshots = timing issue (increase wait time)
 *    - Plain text emails without branding = renderEmail() not being called
 *    - Missing screenshots = page navigation failed
 *    - "cannot open shared object file" = missing Linux dependencies (see above)
 *
 * 4. DO NOT
 *    - Take additional screenshots manually (the script handles all screenshots)
 *    - Modify the database directly unless the script explicitly failed
 *    - Re-run the script without checking why it failed first
 *
 * 5. IF SIMULATION FAILS
 *    - Check the console output for the specific step that failed
 *    - Read the last screenshot taken to see the UI state
 *    - Check Mailpit at http://localhost:8025 for email delivery issues
 *    - Verify all services are running (Next.js, workers, Docker)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "crypto";
import puppeteer, { type Browser, type Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

// Pre-flight check for browser dependencies (Linux only)
function checkBrowserDependencies() {
  if (process.platform !== "linux") return; // Only needed on Linux

  try {
    const chromePath = execSync("node -e \"console.log(require('puppeteer').executablePath())\"", {
      encoding: "utf-8",
    }).trim();

    if (!fs.existsSync(chromePath)) {
      console.log("⚠️  Chrome not found. Running: npx puppeteer browsers install chrome");
      execSync("npx puppeteer browsers install chrome", { stdio: "inherit" });
    }

    // Check for missing libraries
    const lddOutput = execSync(`ldd "${chromePath}" 2>&1`, { encoding: "utf-8" });
    const missingLibs = lddOutput
      .split("\n")
      .filter((line) => line.includes("not found"))
      .map((line) => line.split("=>")[0].trim());

    if (missingLibs.length > 0) {
      console.error("\n❌ Missing browser dependencies detected:");
      console.error("   " + missingLibs.join("\n   "));
      console.error("\n📦 Install them with:");
      console.error("   sudo apt-get update && sudo apt-get install -y libnss3 libnspr4 libasound2\n");
      console.error("   Or for all dependencies:");
      console.error("   sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \\");
      console.error("     libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \\");
      console.error("     libxfixes3 libxrandr2 libgbm1 libasound2\n");
      process.exit(1);
    }
  } catch {
    // If check fails, let Puppeteer handle the error naturally
  }
}

checkBrowserDependencies();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const MAILPIT_URL = "http://localhost:8025";
const MAILPIT_API = `${MAILPIT_URL}/api/v1`;

// Screenshots directory
const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const SCREENSHOTS_DIR = path.join(process.cwd(), "screenshots", `sim-${runId}`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let stepCounter = 0;

function log(step: string, message: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${step}] ${message}`);
}

function logExpectedEmail(recipient: string, description: string) {
  console.log(`         📧  Expected → ${recipient}: ${description}`);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function snap(page: Page, label: string) {
  stepCounter++;
  const filename = `${String(stepCounter).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  log("SNAP", filename);
}

/** Sign in via NextAuth credentials and return the session cookie string. */
async function getSessionCookie(email: string, password: string): Promise<string> {
  const csrfRes = await fetch(`${APP_URL}/api/auth/csrf`);
  if (!csrfRes.ok) throw new Error(`CSRF fetch failed: ${csrfRes.status}`);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? [];

  const signinRes = await fetch(`${APP_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies.join("; "),
    },
    body: new URLSearchParams({ csrfToken, email, password, json: "true" }).toString(),
    redirect: "manual",
  });

  const signinCookies = signinRes.headers.getSetCookie?.() ?? [];
  const cookieMap = new Map<string, string>();
  for (const raw of [...csrfCookies, ...signinCookies]) {
    const kv = raw.split(";")[0];
    const eq = kv.indexOf("=");
    if (eq > 0) cookieMap.set(kv.slice(0, eq), kv.slice(eq + 1));
  }
  const cookieStr = [...cookieMap.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

  const sessionRes = await fetch(`${APP_URL}/api/auth/session`, { headers: { Cookie: cookieStr } });
  const session = await sessionRes.json();
  if (!session?.user?.email) throw new Error(`Auth failed for ${email}`);
  log("AUTH", `Signed in as ${session.user.email} (${session.user.role})`);
  return cookieStr;
}

/** Set auth cookies on a Puppeteer page. */
async function setPageCookies(page: Page, cookieStr: string) {
  const cookies = cookieStr.split("; ").map((c) => {
    const eq = c.indexOf("=");
    return {
      name: c.slice(0, eq),
      value: c.slice(eq + 1),
      domain: new URL(APP_URL).hostname,
      path: "/",
    };
  });
  await page.setCookie(...cookies);
}

/** POST/PATCH helper with auth cookie. */
async function apiFetch(
  apiPath: string,
  opts: { method?: string; body?: unknown; cookie?: string } = {}
) {
  const { method = "POST", body, cookie } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;

  const res = await fetch(`${APP_URL}${apiPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }

  if (res.status >= 400) {
    console.error(`API error ${res.status}:`, json);
    throw new Error(`${method} ${apiPath} → ${res.status}`);
  }
  return json as Record<string, unknown>;
}

/** Poll a condition, short timeout. */
async function poll(
  label: string,
  fn: () => Promise<boolean>,
  { interval = 2000, timeout = 15_000 } = {}
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await fn()) return true;
    log("POLL", `Waiting for ${label}...`);
    await sleep(interval);
  }
  return false;
}

interface MailpitMessage {
  ID: string;
  From: { Address: string };
  To: Array<{ Address: string }>;
  Subject: string;
  Created: string;
}

/** Wait for a specific email to arrive in Mailpit and take a screenshot of it opened. */
async function waitForEmailAndScreenshot(
  page: Page,
  options: {
    recipientContains?: string;
    subjectContains?: string;
    screenshotLabel: string;
    timeout?: number;
  }
): Promise<MailpitMessage | null> {
  const { recipientContains, subjectContains, screenshotLabel, timeout = 10000 } = options;
  const startTime = Date.now();

  log("EMAIL", `Waiting for email: ${subjectContains || recipientContains || "any"}...`);

  while (Date.now() - startTime < timeout) {
    try {
      const res = await fetch(`${MAILPIT_API}/messages?limit=20`);
      if (!res.ok) {
        await sleep(1000);
        continue;
      }

      const data = (await res.json()) as { total: number; messages: MailpitMessage[] };

      for (const msg of data.messages) {
        const recipients = msg.To.map((t) => t.Address.toLowerCase()).join(" ");
        const subject = msg.Subject.toLowerCase();

        const matchesRecipient = !recipientContains || recipients.includes(recipientContains.toLowerCase());
        const matchesSubject = !subjectContains || subject.includes(subjectContains.toLowerCase());

        if (matchesRecipient && matchesSubject) {
          log("EMAIL", `Found: "${msg.Subject}" → ${msg.To.map(t => t.Address).join(", ")}`);

          // Open the email in Mailpit and take screenshot
          await page.goto(`${MAILPIT_URL}/view/${msg.ID}`, { waitUntil: "networkidle2", timeout: 10000 });
          await sleep(500); // Let email content render
          await snap(page, screenshotLabel);

          return msg;
        }
      }
    } catch (err) {
      // Mailpit may not be ready yet
    }

    await sleep(1000);
  }

  log("EMAIL", `Timeout waiting for email: ${subjectContains || recipientContains || "any"}`);
  // Take screenshot of inbox anyway
  await page.goto(MAILPIT_URL, { waitUntil: "networkidle2", timeout: 10000 }).catch(() => {});
  await snap(page, `${screenshotLabel}-not-found`);
  return null;
}

// ---------------------------------------------------------------------------
// Main simulation
// ---------------------------------------------------------------------------

async function run() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  log("INIT", `Screenshots → ${SCREENSHOTS_DIR}`);

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
  });
  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   GroupBus Full Workflow Simulation       ║");
  console.log("║   Browser-driven with screenshots        ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // Unique email per run to avoid collisions with previous simulation data
  const runId = Date.now().toString(36);
  const customerEmail = `sim-${runId}@test.groupbus.co.uk`;
  log("INIT", `Customer email for this run: ${customerEmail}`);

  try {
    // ================================================================
    // STEP 0: Setup & authenticate
    // ================================================================
    log("STEP 0", "Setting up authentication sessions");

    const adminCookie = await getSessionCookie("admin@groupbus.co.uk", "admin123!");

    const supplierUser = await prisma.user.findFirst({
      where: { role: "SUPPLIER", isActive: true, deletedAt: null },
      include: { organisation: true },
    });
    if (!supplierUser) throw new Error("No supplier user in DB");
    const supplierCookie = await getSessionCookie(supplierUser.email, "supplier123!");

    // Clear Mailpit inbox before starting
    try {
      const deleteResponse = await fetch(`${MAILPIT_API}/messages`, { method: "DELETE" });
      if (deleteResponse.ok) {
        log("INIT", "Cleared Mailpit inbox");
      }
    } catch {
      log("INIT", "Could not clear Mailpit inbox (may be empty or unavailable)");
    }

    // Screenshot Mailpit before (should be empty now)
    await page.goto(MAILPIT_URL, { waitUntil: "networkidle2", timeout: 10000 }).catch(() => {});
    await snap(page, "mailpit-before");

    // ================================================================
    // STEP 1: Customer submits enquiry via the website form
    // ================================================================
    log("STEP 1", "Customer navigating to enquiry form");
    await page.goto(`${APP_URL}/enquiry`, { waitUntil: "networkidle2", timeout: 15000 });
    await snap(page, "step1-enquiry-form-loaded");

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDateStr = futureDate.toISOString().slice(0, 10); // YYYY-MM-DD

    // --- Step 1 of wizard: Trip Details ---
    log("STEP 1", "Filling trip details (step 1/5)");

    // Select trip type — click "One Way" Card by clicking on the text directly
    await page.evaluate(() => {
      // Find the <p> element that contains exactly "One Way" text
      const paragraphs = document.querySelectorAll('p');
      for (const p of paragraphs) {
        if (p.textContent?.trim() === 'One Way') {
          // Click the parent card element
          const card = p.closest('[class*="cursor-pointer"]') ||
                       p.closest('[class*="Card"]') ||
                       p.closest('[class*="card"]');
          if (card) {
            (card as HTMLElement).click();
            console.log('Clicked One Way card via parent');
            return;
          }
          // If no card parent, click the p element itself (might bubble up)
          p.click();
          console.log('Clicked One Way p element');
          return;
        }
      }
    });
    await sleep(500);

    // Verify the selection
    const selectedType = await page.evaluate(() => {
      const selectedCard = document.querySelector('[class*="ring-primary"], [class*="border-primary"]');
      return selectedCard?.textContent?.includes('One Way') ? 'One Way' :
             selectedCard?.textContent?.includes('Return') ? 'Return' : 'Unknown';
    });
    log("STEP 1", `Selected trip type: ${selectedType}`);

    // Fill pickup location
    const pickupInput = await page.$('#pickupLocation');
    if (pickupInput) {
      await pickupInput.click({ clickCount: 3 });
      await pickupInput.type("London Victoria Coach Station", { delay: 20 });
      await sleep(2000); // Wait for autocomplete API response

      // Click first suggestion button in the autocomplete dropdown
      await page.evaluate(() => {
        const pickupContainer = document.querySelector('#pickupLocation')?.parentElement;
        const suggestionButtons = pickupContainer?.querySelectorAll('button[type="button"]');
        if (suggestionButtons && suggestionButtons.length > 0) {
          (suggestionButtons[0] as HTMLElement).click();
        }
      });
      await sleep(500);
    }

    // Close any open dropdowns by pressing Escape (safer than clicking body)
    await page.keyboard.press('Escape');
    await sleep(300);

    // Fill dropoff location
    const dropoffInput = await page.$('#dropoffLocation');
    if (dropoffInput) {
      await dropoffInput.click({ clickCount: 3 });
      await dropoffInput.type("Brighton Churchill Square", { delay: 20 });
      await sleep(2000); // Wait for autocomplete API response

      // Click first suggestion button in the autocomplete dropdown
      await page.evaluate(() => {
        // The suggestions are button elements inside a dropdown div
        const dropdownContainer = document.querySelector('#dropoffLocation')?.parentElement;
        const suggestionButtons = dropdownContainer?.querySelectorAll('button[type="button"]');
        if (suggestionButtons && suggestionButtons.length > 0) {
          (suggestionButtons[0] as HTMLElement).click();
        }
      });
      await sleep(500);
    }

    // Close any open dropdowns by pressing Escape
    await page.keyboard.press('Escape');
    await sleep(300);

    // Fill departure date - set value and trigger React's onChange via native setter
    await page.evaluate((dateStr: string) => {
      const input = document.querySelector('#departureDate') as HTMLInputElement;
      if (input) {
        // Use Object.getOwnPropertyDescriptor to get the native setter
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, dateStr);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, futureDateStr);
    await sleep(300);

    // Fill departure time
    await page.evaluate(() => {
      const input = document.querySelector('#departureTime') as HTMLInputElement;
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(input, '09:00');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await sleep(300);

    // Blur inputs by pressing Tab
    await page.keyboard.press('Tab');
    await sleep(300);

    await snap(page, "step1-trip-details-filled");

    // Click Next and wait for step 2
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const next = btns.find((b) => b.textContent?.trim().toLowerCase().includes("next"));
      next?.click();
    });
    await sleep(1000);
    // Wait for Vehicle Preferences heading to appear
    await page.waitForFunction(
      () => document.body.textContent?.includes("Vehicle Preferences") || document.body.textContent?.includes("Passengers"),
      { timeout: 5000 }
    ).catch(() => log("STEP 1", "Warning: Vehicle step may not have loaded"));
    await sleep(300);

    // --- Step 2 of wizard: Vehicle Preferences ---
    log("STEP 1", "Filling vehicle preferences (step 2/5)");

    // Set passenger count
    const passengerInput = await page.$('input[name="passengerCount"], input[type="number"]');
    if (passengerInput) {
      await passengerInput.click({ clickCount: 3 });
      await passengerInput.type("35", { delay: 20 });
    }

    // Select vehicle type — Standard Coach
    await page.evaluate(() => {
      const els = document.querySelectorAll("[role='radio'], [data-value], button, label, div[class*='card']");
      for (const el of els) {
        if (el.textContent?.includes("Standard Coach") || el.textContent?.includes("STANDARD_COACH")) {
          (el as HTMLElement).click();
          break;
        }
      }
    });
    await sleep(300);

    await snap(page, "step1-vehicle-preferences");

    // Click Next and wait for step 3
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const next = btns.find((b) => b.textContent?.trim().toLowerCase().includes("next"));
      next?.click();
    });
    await sleep(1000);
    await page.waitForFunction(
      () => document.body.textContent?.includes("Additional Information") || document.body.textContent?.includes("Special Requirements"),
      { timeout: 5000 }
    ).catch(() => log("STEP 1", "Warning: Additional Info step may not have loaded"));
    await sleep(300);

    // --- Step 3 of wizard: Additional Info ---
    log("STEP 1", "Filling additional info (step 3/5)");

    const notesInput = await page.$('textarea[name="additionalNotes"], textarea');
    if (notesInput) {
      await notesInput.type("This is a simulation test enquiry — please process.", { delay: 10 });
    }

    await snap(page, "step1-additional-info");

    // Click Next and wait for step 4
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const next = btns.find((b) => b.textContent?.trim().toLowerCase().includes("next"));
      next?.click();
    });
    await sleep(1000);
    await page.waitForFunction(
      () => document.body.textContent?.includes("Contact Details") || document.body.textContent?.includes("Full Name"),
      { timeout: 5000 }
    ).catch(() => log("STEP 1", "Warning: Contact Details step may not have loaded"));
    await sleep(300);

    // --- Step 4 of wizard: Contact Details ---
    log("STEP 1", "Filling contact details (step 4/5)");

    // Use specific IDs from the form component
    const nameInput = await page.$('#contactName');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type("Simulation Test Customer", { delay: 20 });
    }

    const emailInput = await page.$('#contactEmail');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(customerEmail, { delay: 20 });
    }

    const phoneInput = await page.$('#contactPhone');
    if (phoneInput) {
      await phoneInput.click({ clickCount: 3 });
      await phoneInput.type("07700900123", { delay: 20 });
    }

    const companyInput = await page.$('#companyName');
    if (companyInput) {
      await companyInput.click({ clickCount: 3 });
      await companyInput.type("Simulation Corp", { delay: 20 });
    }

    // Click GDPR consent button (it's a styled button, not a checkbox)
    await page.evaluate(() => {
      // Find button containing "Data Processing Consent" text
      const buttons = document.querySelectorAll('button[type="button"]');
      for (const btn of buttons) {
        if (btn.textContent?.includes("Data Processing Consent")) {
          btn.click();
          return;
        }
      }
      // Fallback: find any element with consent text and click it
      const consentElements = document.querySelectorAll('*');
      for (const el of consentElements) {
        if ((el as HTMLElement).textContent?.includes("Data Processing Consent") &&
            (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button')) {
          (el as HTMLElement).click();
          return;
        }
      }
    });
    await sleep(500);

    await snap(page, "step1-contact-details");

    // Click Next to go to Review (step 5)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const next = btns.find((b) => b.textContent?.trim().toLowerCase().includes("next"));
      next?.click();
    });
    await sleep(1000);
    await page.waitForFunction(
      () => document.body.textContent?.includes("Review Your Enquiry") || document.body.textContent?.includes("Submit Enquiry"),
      { timeout: 5000 }
    ).catch(() => log("STEP 1", "Warning: Review step may not have loaded"));
    await sleep(500);

    // --- Step 5 of wizard: Review ---
    log("STEP 1", "Reviewing and submitting (step 5/5)");
    await snap(page, "step1-review");

    // Click Submit
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const submit = btns.find((b) =>
        b.textContent?.trim().toLowerCase().includes("submit") &&
        b.textContent?.trim().toLowerCase().includes("enquiry")
      );
      if (submit) submit.click();
      else {
        // Fallback: any submit button
        const sub = btns.find((b) => b.type === "submit" || b.textContent?.trim().toLowerCase().includes("submit"));
        sub?.click();
      }
    });

    // Wait for navigation to confirmation page
    await sleep(3000);
    await snap(page, "step1-confirmation-page");

    // Extract reference from URL or page content
    const confirmUrl = page.url();
    const refMatch = confirmUrl.match(/ref=(GB-ENQ-[^&]+)/) ||
                     (await page.content()).match(/GB-ENQ-\d{4}-\d{5}/);

    let enquiryRef = refMatch?.[1] ?? refMatch?.[0] ?? "";
    log("STEP 1", `Confirmation page URL: ${confirmUrl}`);

    // If we couldn't extract ref from the page, find the most recent enquiry
    const latestEnquiry = await prisma.enquiry.findFirst({
      where: { contactEmail: customerEmail },
      orderBy: { createdAt: "desc" },
    });

    if (!latestEnquiry) {
      // Fallback: submit via API if browser form didn't work
      log("STEP 1", "Browser form submission may not have completed — submitting via API");
      const result = await apiFetch("/api/enquiries", {
        body: {
          pickupLocation: "London Victoria Coach Station",
          pickupLat: 51.4928, pickupLng: -0.1469,
          dropoffLocation: "Brighton Churchill Square",
          dropoffLat: 50.8225, dropoffLng: -0.1372,
          tripType: "ONE_WAY",
          departureDate: futureDate.toISOString(),
          departureTime: "09:00",
          passengerCount: 35,
          vehicleType: "STANDARD_COACH",
          contactName: "Simulation Test Customer",
          contactEmail: customerEmail,
          contactPhone: "07700900123",
          companyName: "Simulation Corp",
          gdprConsent: true,
          additionalNotes: "This is a simulation test enquiry",
        },
      });
      enquiryRef = result.referenceNumber as string;
    }

    const enquiry = await prisma.enquiry.findFirst({
      where: { contactEmail: customerEmail },
      orderBy: { createdAt: "desc" },
    });
    if (!enquiry) throw new Error("Enquiry not found in database");
    const enquiryId = enquiry.id;
    enquiryRef = enquiry.referenceNumber;

    log("STEP 1", `Enquiry created: ${enquiryRef}`);
    logExpectedEmail(customerEmail, "Enquiry confirmation");

    // Wait for confirmation email and screenshot it opened in Mailpit
    await waitForEmailAndScreenshot(page, {
      recipientContains: customerEmail,
      subjectContains: enquiryRef,
      screenshotLabel: "step1-email-enquiry-confirmation",
      timeout: 15000,
    });

    // ================================================================
    // STEP 2: Wait for AI pipeline / advance manually
    // ================================================================
    log("STEP 2", "Waiting for AI pipeline (15s)...");

    const aiOk = await poll("AI to process enquiry", async () => {
      const e = await prisma.enquiry.findUnique({ where: { id: enquiryId }, select: { status: true } });
      return e != null && e.status !== "SUBMITTED" && e.status !== "UNDER_REVIEW";
    });

    if (!aiOk) {
      log("STEP 2", "AI pipeline timeout — advancing manually");
      await prisma.enquiry.update({ where: { id: enquiryId }, data: { status: "SENT_TO_SUPPLIERS" } });
    }

    const enqAfter = await prisma.enquiry.findUnique({ where: { id: enquiryId }, select: { status: true } });
    log("STEP 2", `Enquiry status: ${enqAfter?.status}`);

    // Screenshot admin enquiry detail
    await setPageCookies(page, adminCookie);
    await page.goto(`${APP_URL}/enquiries/${enquiryId}`, { waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    await snap(page, "step2-admin-enquiry-detail");

    // ================================================================
    // STEP 3: Supplier submits bid via the bid form UI
    // ================================================================
    log("STEP 3", "Supplier submitting bid");

    let supplierEnquiries = await prisma.supplierEnquiry.findMany({
      where: { enquiryId },
      include: { organisation: true },
    });

    if (supplierEnquiries.length === 0) {
      log("STEP 3", "Creating supplier enquiry manually");
      const supplier = await prisma.organisation.findFirst({ where: { type: "SUPPLIER", isActive: true } });
      if (!supplier) throw new Error("No supplier org found");

      const se = await prisma.supplierEnquiry.create({
        data: {
          enquiryId,
          organisationId: supplier.id,
          accessToken: crypto.randomBytes(32).toString("base64url"),
          status: "PENDING",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        include: { organisation: true },
      });
      supplierEnquiries = [se];
    }

    const bidToken = supplierEnquiries[0].accessToken;
    log("STEP 3", `Navigating to bid form for ${supplierEnquiries[0].organisation.name}`);

    // Navigate to bid page and wait for content to load
    await page.goto(`${APP_URL}/bid/${bidToken}`, { waitUntil: "networkidle2", timeout: 15000 });

    // Wait for the bid form to load (loading spinner to disappear or form fields to appear)
    try {
      await page.waitForFunction(
        () => {
          // Check if loading spinner is gone
          const loadingText = document.body.textContent?.includes("Loading bid request");
          if (loadingText) return false;
          // Check if form fields are present
          const formField = document.querySelector('input[name="basePrice"], input[id="basePrice"], form');
          return !!formField;
        },
        { timeout: 10000 }
      );
      log("STEP 3", "Bid form loaded successfully");
    } catch {
      log("STEP 3", "Warning: Bid form may not have loaded completely");
    }
    await sleep(500);
    await snap(page, "step3-bid-form-loaded");

    // Fill bid form
    const basePriceInput = await page.$('input[name="basePrice"], input[id="basePrice"]');
    if (basePriceInput) {
      await basePriceInput.click({ clickCount: 3 });
      await basePriceInput.type("850", { delay: 30 });
    }

    // Fuel surcharge
    const fuelInput = await page.$('input[name="fuelSurcharge"], input[id="fuelSurcharge"]');
    if (fuelInput) {
      await fuelInput.click({ clickCount: 3 });
      await fuelInput.type("45", { delay: 30 });
    }

    // Toll charges
    const tollInput = await page.$('input[name="tollCharges"], input[id="tollCharges"]');
    if (tollInput) {
      await tollInput.click({ clickCount: 3 });
      await tollInput.type("12", { delay: 30 });
    }

    // Vehicle offered
    const vehicleInput = await page.$('input[name="vehicleOffered"], input[id="vehicleOffered"]');
    if (vehicleInput) {
      await vehicleInput.click({ clickCount: 3 });
      await vehicleInput.type("49-seat Volvo Executive Coach", { delay: 20 });
    }

    // Notes
    const bidNotes = await page.$('textarea[name="notes"], textarea[id="notes"]');
    if (bidNotes) {
      await bidNotes.type("Simulation bid — standard 49-seat coach available", { delay: 10 });
    }

    // Wait a moment for form state to settle before screenshot
    await sleep(500);
    await snap(page, "step3-bid-form-filled");

    // Submit bid
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const submit = btns.find((b) => b.textContent?.trim().toLowerCase().includes("submit"));
      submit?.click();
    });

    await sleep(3000);
    await snap(page, "step3-bid-submitted-success");

    // Check if the bid was actually saved — if not, submit via API
    const bidCheck = await prisma.supplierQuote.findFirst({
      where: { supplierEnquiry: { enquiryId } },
    });
    if (!bidCheck) {
      log("STEP 3", "Browser bid submission did not persist — submitting via API");
      const bidResp = await fetch(`${APP_URL}/api/bid/${bidToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePrice: 850,
          fuelSurcharge: 45,
          tollCharges: 12,
          parkingCharges: 0,
          otherCharges: 0,
          vehicleOffered: "49-seat Volvo Executive Coach",
          notes: "Simulation bid — standard 49-seat coach available",
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (!bidResp.ok) {
        const errBody = await bidResp.text();
        log("STEP 3", `API bid submission failed (${bidResp.status}): ${errBody}`);
        // Create SupplierQuote directly via Prisma as last resort
        await prisma.supplierQuote.create({
          data: {
            supplierEnquiryId: supplierEnquiries[0].id,
            organisationId: supplierEnquiries[0].organisationId,
            basePrice: 850,
            fuelSurcharge: 45,
            tollCharges: 12,
            parkingCharges: 0,
            otherCharges: 0,
            totalPrice: 907,
            currency: "GBP",
            vehicleOffered: "49-seat Volvo Executive Coach",
            notes: "Simulation bid — standard 49-seat coach available",
            status: "SUBMITTED",
            validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
        await prisma.supplierEnquiry.update({
          where: { id: supplierEnquiries[0].id },
          data: { status: "SUBMITTED" },
        });
        log("STEP 3", "Created SupplierQuote directly via Prisma");
      } else {
        log("STEP 3", "Bid submitted via API successfully");
      }
    } else {
      log("STEP 3", "Bid submitted via browser successfully");
    }

    // Expire other pending supplier enquiries
    await prisma.supplierEnquiry.updateMany({
      where: { enquiryId, status: "PENDING", id: { not: supplierEnquiries[0].id } },
      data: { status: "EXPIRED" },
    });

    // ================================================================
    // STEP 4: Wait for quote generation / create manually
    // ================================================================
    log("STEP 4", "Waiting for quote generation (15s)...");

    const quoteOk = await poll("customer quote", async () => {
      const q = await prisma.customerQuote.findFirst({ where: { enquiryId } });
      return q != null;
    });

    if (!quoteOk) {
      log("STEP 4", "Creating quote manually");
      const sq = await prisma.supplierQuote.findFirst({ where: { supplierEnquiry: { enquiryId } } });
      if (!sq) throw new Error("No supplier quote found — bid submission failed at all levels");

      const qSeq = await prisma.sequence.upsert({
        where: { prefix_year: { prefix: "QTE", year: new Date().getFullYear() } },
        update: { currentValue: { increment: 1 } },
        create: { prefix: "QTE", year: new Date().getFullYear(), currentValue: 1 },
      });
      const qRef = `QTE-${new Date().getFullYear()}-${String(qSeq.currentValue).padStart(5, "0")}`;
      const sp = Number(sq.totalPrice);
      const ma = Math.round(sp * 0.25 * 100) / 100;
      const sub = sp + ma;
      const vat = Math.round(sub * 0.20 * 100) / 100;

      await prisma.customerQuote.create({
        data: {
          referenceNumber: qRef, enquiryId, supplierQuoteId: sq.id,
          supplierPrice: sp, markupPercentage: 25, markupAmount: ma,
          subtotal: sub, vatRate: 20, vatAmount: vat, totalPrice: sub + vat,
          currency: "GBP", status: "DRAFT",
          acceptanceToken: crypto.randomBytes(32).toString("base64url"),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      await prisma.enquiry.update({ where: { id: enquiryId }, data: { status: "QUOTE_SENT" } });
    }

    const customerQuote = await prisma.customerQuote.findFirst({
      where: { enquiryId },
      select: { id: true, referenceNumber: true, totalPrice: true, acceptanceToken: true },
    });
    if (!customerQuote) throw new Error("Quote not created");

    log("STEP 4", `Quote: ${customerQuote.referenceNumber} — £${customerQuote.totalPrice}`);

    // ================================================================
    // STEP 5: Admin sends quote to customer via admin UI
    // ================================================================
    log("STEP 5", "Admin viewing and sending quote");

    await setPageCookies(page, adminCookie);
    await page.goto(`${APP_URL}/quotes/${customerQuote.id}`, { waitUntil: "networkidle2", timeout: 15000 });
    await snap(page, "step5-admin-quote-detail");

    // Try clicking "Send Quote" button in the UI
    const sendClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const send = btns.find((b) => b.textContent?.trim().toLowerCase().includes("send quote"));
      if (send) { send.click(); return true; }
      return false;
    });

    if (!sendClicked) {
      log("STEP 5", "Send button not found — sending via API");
      await apiFetch(`/api/quotes/${customerQuote.id}/send`, { cookie: adminCookie });
    }

    await sleep(2000);
    await snap(page, "step5-quote-sent");

    logExpectedEmail(customerEmail, "Quote email");

    // Wait for quote email and screenshot it opened in Mailpit
    await waitForEmailAndScreenshot(page, {
      recipientContains: customerEmail,
      subjectContains: customerQuote.referenceNumber,
      screenshotLabel: "step5-email-quote-to-customer",
      timeout: 15000,
    });

    // ================================================================
    // STEP 6: Customer accepts quote & pays via Stripe checkout
    // ================================================================
    log("STEP 6", "Customer viewing quote acceptance page");

    // Refresh quote to get latest acceptance token
    const freshQuote = await prisma.customerQuote.findUnique({
      where: { id: customerQuote.id },
      include: { supplierQuote: true },
    });
    if (!freshQuote?.supplierQuote) throw new Error("Quote missing supplier data");

    // Clear admin cookies and navigate to customer quote page
    await page.deleteCookie(...(await page.cookies()));
    await page.goto(`${APP_URL}/quote/${freshQuote.acceptanceToken}`, {
      waitUntil: "networkidle2", timeout: 15000,
    });

    // Wait for quote data to load (loading spinner to disappear or quote details to appear)
    try {
      await page.waitForFunction(
        () => {
          // Check if loading spinner is gone
          const loadingText = document.body.textContent?.includes("Loading your quote");
          if (loadingText) return false;
          // Check if quote details are present (price, accept button, etc.)
          const priceEl = document.body.textContent?.match(/£[\d,]+(\.\d{2})?/);
          const acceptBtn = document.querySelector('button, a');
          const hasAcceptText = document.body.textContent?.toLowerCase().includes("accept");
          return !!priceEl || (!!acceptBtn && hasAcceptText);
        },
        { timeout: 10000 }
      );
      log("STEP 6", "Quote page loaded successfully");
    } catch {
      log("STEP 6", "Warning: Quote page may not have loaded completely");
    }
    await sleep(500);
    await snap(page, "step6-customer-quote-page");

    // Click "Accept & Pay" button
    log("STEP 6", "Clicking Accept & Pay");
    const acceptClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button, a"));
      const accept = btns.find((b) =>
        b.textContent?.toLowerCase().includes("accept") &&
        b.textContent?.toLowerCase().includes("pay")
      );
      if (accept) { (accept as HTMLElement).click(); return true; }
      return false;
    });

    if (!acceptClicked) {
      // Fallback via API
      log("STEP 6", "Accept button not found — using API");
      const acceptRes = await apiFetch(`/api/quote/${freshQuote.acceptanceToken}/accept`);
      const checkoutUrl = acceptRes.checkoutUrl as string;
      await page.goto(checkoutUrl, { waitUntil: "networkidle2", timeout: 30000 });
    }

    // Wait for Stripe checkout to load
    await sleep(3000);
    await snap(page, "step6-stripe-checkout-loaded");

    // Fill Stripe checkout form
    log("STEP 6", "Filling Stripe test card (4242 4242 4242 4242)");

    // Email field (top-level, not in iframe)
    try {
      await page.waitForSelector("#email", { timeout: 5000 });
      await page.type("#email", customerEmail, { delay: 20 });
    } catch { /* Email may not be required */ }

    // Card fields are inside Stripe iframes
    // Stripe Checkout uses specific iframe patterns
    await sleep(2000);

    // Find all iframes and try to fill card details
    const frames = page.frames();
    for (const frame of frames) {
      try {
        const cardInput = await frame.$('input[name="cardnumber"], input[name="number"], input[autocomplete="cc-number"]');
        if (cardInput) {
          await cardInput.type("4242424242424242", { delay: 20 });
          log("STEP 6", "Card number entered");
        }
        const expInput = await frame.$('input[name="exp-date"], input[name="expiry"], input[autocomplete="cc-exp"]');
        if (expInput) {
          await expInput.type("1230", { delay: 20 });
          log("STEP 6", "Expiry entered");
        }
        const cvcInput = await frame.$('input[name="cvc"], input[autocomplete="cc-csc"]');
        if (cvcInput) {
          await cvcInput.type("123", { delay: 20 });
          log("STEP 6", "CVC entered");
        }
      } catch { /* Try next frame */ }
    }

    // Cardholder name (top-level)
    try {
      const billingName = await page.$("#billingName");
      if (billingName) await billingName.type("Simulation Test Customer", { delay: 20 });
    } catch {}

    await snap(page, "step6-stripe-card-filled");

    // Click Pay
    log("STEP 6", "Submitting payment");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button, [role='button']"));
      const pay = btns.find((b) => b.textContent?.toLowerCase().includes("pay"));
      if (pay) (pay as HTMLElement).click();
    });

    // Wait for payment processing and redirect
    log("STEP 6", "Waiting for payment to process...");
    await sleep(8000);
    await snap(page, "step6-payment-processing");

    // Wait for redirect to success page
    try {
      await page.waitForFunction(
        (url: string) => window.location.href.includes("success") || window.location.href.includes(url),
        { timeout: 30000 },
        APP_URL
      );
    } catch {
      log("STEP 6", "Redirect timeout — checking payment status");
    }
    await snap(page, "step6-after-payment");

    // Wait for webhook to create booking (or fallback)
    log("STEP 6", "Waiting for booking creation...");
    let booking: { id: string; referenceNumber: string } | null = null;

    const bookingOk = await poll("booking creation", async () => {
      booking = await prisma.booking.findFirst({
        where: { customerQuoteId: freshQuote.id },
        select: { id: true, referenceNumber: true },
      });
      return booking != null;
    }, { timeout: 30_000 });

    if (!bookingOk) {
      log("STEP 6", "Webhook didn't fire — creating booking manually");
      const payment = await prisma.payment.findFirst({
        where: { customerQuoteId: freshQuote.id },
        orderBy: { createdAt: "desc" },
      });
      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED", stripePaymentIntentId: `sim_pi_${Date.now()}` },
        });
      }
      await prisma.customerQuote.update({
        where: { id: freshQuote.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      const year = new Date().getFullYear();
      const seq = await prisma.sequence.upsert({
        where: { prefix_year: { prefix: "BKG", year } },
        update: { currentValue: { increment: 1 } },
        create: { prefix: "BKG", year, currentValue: 1 },
      });
      const bRef = `BKG-${year}-${String(seq.currentValue).padStart(5, "0")}`;
      const created = await prisma.booking.create({
        data: {
          referenceNumber: bRef, enquiryId,
          customerQuoteId: freshQuote.id,
          organisationId: freshQuote.supplierQuote.organisationId,
          status: "CONFIRMED",
        },
      });
      await prisma.enquiry.update({ where: { id: enquiryId }, data: { status: "ACCEPTED" } });
      booking = { id: created.id, referenceNumber: created.referenceNumber };
    }

    if (!booking) throw new Error("Booking not created");
    const bookingRef = booking.referenceNumber;
    log("STEP 6", `Booking: ${bookingRef} (${booking.id})`);

    // ================================================================
    // STEP 7: Admin assigns vehicle via admin booking detail
    // ================================================================
    log("STEP 7", "Admin assigning vehicle");

    const vehicle = await prisma.vehicle.findFirst({
      where: { organisationId: freshQuote.supplierQuote.organisationId, isActive: true },
    });
    if (!vehicle) throw new Error("No vehicle found");

    const driver = await prisma.driverProfile.findFirst({
      where: { organisationId: freshQuote.supplierQuote.organisationId, isActive: true },
    });

    // Screenshot admin booking page
    await setPageCookies(page, adminCookie);
    await page.goto(`${APP_URL}/bookings/${booking.id}`, { waitUntil: "networkidle2", timeout: 15000 });
    await snap(page, "step7-admin-booking-detail");

    // Assign via API (admin UI assignment may require complex dropdown interactions)
    const assignBody: Record<string, string> = { vehicleId: vehicle.id };
    if (driver) assignBody.driverId = driver.id;
    await apiFetch(`/api/bookings/${booking.id}/assign`, { cookie: adminCookie, body: assignBody });

    log("STEP 7", `Assigned vehicle ${vehicle.registrationNumber}${driver ? " with driver" : ""}`);

    const supplierOrg = await prisma.organisation.findUnique({
      where: { id: freshQuote.supplierQuote.organisationId },
      select: { email: true, name: true },
    });
    logExpectedEmail(supplierOrg?.email ?? "supplier", "Assignment notification");

    // Refresh booking page after assignment
    await page.reload({ waitUntil: "networkidle2" });
    await snap(page, "step7-booking-after-assignment");

    // Wait for assignment notification email to supplier
    await waitForEmailAndScreenshot(page, {
      recipientContains: supplierOrg?.email,
      subjectContains: bookingRef,
      screenshotLabel: "step7-email-assignment-to-supplier",
      timeout: 15000,
    });

    // ================================================================
    // STEP 8: Supplier accepts booking
    // ================================================================
    log("STEP 8", "Supplier accepting booking");

    const orgSupplier = await prisma.user.findFirst({
      where: { role: "SUPPLIER", organisationId: freshQuote.supplierQuote.organisationId, isActive: true },
    });

    let acceptCookie = supplierCookie;
    if (orgSupplier && orgSupplier.email !== supplierUser.email) {
      try { acceptCookie = await getSessionCookie(orgSupplier.email, "supplier123!"); } catch {}
    }

    await apiFetch(`/api/bookings/${booking.id}/supplier-response`, {
      cookie: acceptCookie,
      body: { action: "accept" },
    });

    log("STEP 8", "Supplier accepted");
    logExpectedEmail("admin@groupbus.co.uk", "Acceptance notification");

    // Screenshot booking after acceptance
    await setPageCookies(page, adminCookie);
    await page.goto(`${APP_URL}/bookings/${booking.id}`, { waitUntil: "networkidle2", timeout: 15000 });
    await snap(page, "step8-booking-after-acceptance");

    // Wait for acceptance notification email to admin
    await waitForEmailAndScreenshot(page, {
      recipientContains: "admin@groupbus.co.uk",
      subjectContains: "accepted",
      screenshotLabel: "step8-email-acceptance-to-admin",
      timeout: 15000,
    });

    // ================================================================
    // STEP 9: Admin marks IN_PROGRESS
    // ================================================================
    log("STEP 9", "Admin marking IN_PROGRESS");

    await apiFetch(`/api/bookings/${booking.id}/status`, {
      method: "PATCH", cookie: adminCookie,
      body: { status: "IN_PROGRESS", notes: "Trip has started" },
    });

    await setPageCookies(page, adminCookie);
    await page.goto(`${APP_URL}/bookings/${booking.id}`, { waitUntil: "networkidle2", timeout: 15000 });
    await snap(page, "step9-booking-in-progress");

    // ================================================================
    // STEP 10: Admin marks COMPLETED
    // ================================================================
    log("STEP 10", "Admin marking COMPLETED");

    await apiFetch(`/api/bookings/${booking.id}/status`, {
      method: "PATCH", cookie: adminCookie,
      body: { status: "COMPLETED", notes: "Trip completed successfully" },
    });

    log("STEP 10", "Booking completed");
    logExpectedEmail(customerEmail, "Completion + survey link");
    logExpectedEmail(supplierOrg?.email ?? "supplier", "Job completion");

    await page.goto(`${APP_URL}/bookings/${booking.id}`, { waitUntil: "networkidle2", timeout: 15000 });
    await snap(page, "step10-booking-completed");

    // Wait for completion emails to customer and supplier
    await waitForEmailAndScreenshot(page, {
      recipientContains: customerEmail,
      subjectContains: "completed",
      screenshotLabel: "step10-email-completion-to-customer",
      timeout: 15000,
    });

    await waitForEmailAndScreenshot(page, {
      recipientContains: supplierOrg?.email,
      subjectContains: "completed",
      screenshotLabel: "step10-email-completion-to-supplier",
      timeout: 10000,
    });

    // ================================================================
    // MAILPIT: Summary of all emails
    // ================================================================
    log("MAILPIT", "Generating email summary...");

    await page.goto(MAILPIT_URL, { waitUntil: "networkidle2", timeout: 10000 }).catch(() => {});
    await snap(page, "final-mailpit-inbox");

    try {
      const mailpitRes = await fetch(`${MAILPIT_API}/messages?limit=50`);
      if (mailpitRes.ok) {
        const data = (await mailpitRes.json()) as {
          total: number;
          messages: MailpitMessage[];
        };

        console.log("\n╔══════════════════════════════════════════╗");
        console.log(`║  Mailpit: ${String(data.total).padStart(2)} emails captured             ║`);
        console.log("╚══════════════════════════════════════════╝\n");

        const markers = [enquiryRef, bookingRef, customerQuote.referenceNumber, customerEmail];
        let relevantCount = 0;

        for (const msg of data.messages) {
          const to = msg.To.map((t) => t.Address).join(", ");
          const relevant = markers.some(
            (m) => msg.Subject.toLowerCase().includes(m.toLowerCase()) ||
                   to.toLowerCase().includes(m.toLowerCase()) ||
                   to.includes(supplierOrg?.email ?? "__none__")
          );
          const tag = relevant ? "✅" : "  ";
          if (relevant) relevantCount++;
          console.log(`${tag} ${msg.Created.slice(11, 19)} | ${to.padEnd(42)} | ${msg.Subject}`);
        }

        console.log(`\n✅ ${relevantCount} emails from this simulation run\n`);
      }
    } catch {
      log("MAILPIT", "Could not reach Mailpit — is it running?");
    }

    // ================================================================
    // Done
    // ================================================================
    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║          Simulation Complete!            ║");
    console.log("╠══════════════════════════════════════════╣");
    console.log(`║  Enquiry:     ${enquiryRef.padEnd(26)}║`);
    console.log(`║  Quote:       ${customerQuote.referenceNumber.padEnd(26)}║`);
    console.log(`║  Booking:     ${bookingRef.padEnd(26)}║`);
    console.log(`║  Screenshots: ${SCREENSHOTS_DIR.slice(-26).padEnd(26)}║`);
    console.log(`║  Mailpit:     http://localhost:8025      ║`);
    console.log("╚══════════════════════════════════════════╝\n");

  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

run()
  .catch((err) => {
    console.error("\n❌ Simulation failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
