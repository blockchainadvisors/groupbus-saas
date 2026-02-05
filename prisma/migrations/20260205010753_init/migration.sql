-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'CLIENT', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "OrganisationType" AS ENUM ('SUPPLIER', 'CLIENT');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SENT_TO_SUPPLIERS', 'QUOTES_RECEIVED', 'QUOTE_SENT', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SupplierQuoteStatus" AS ENUM ('REQUESTED', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CustomerQuoteStatus" AS ENUM ('DRAFT', 'MARKUP_APPLIED', 'SENT_TO_CUSTOMER', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'SUPPLIER_ASSIGNED', 'SUPPLIER_ACCEPTED', 'SUPPLIER_REJECTED', 'PRE_TRIP_READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('MINIBUS', 'STANDARD_COACH', 'EXECUTIVE_COACH', 'DOUBLE_DECKER', 'MIDI_COACH', 'OTHER');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('ONE_WAY', 'RETURN', 'MULTI_STOP');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INSURANCE', 'LICENSE', 'MOT', 'COMPLIANCE', 'JOB_SHEET', 'DRIVER_BRIEFING', 'ROUTE_NOTES', 'QUOTE_PDF', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'BOTH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "SurveyType" AS ENUM ('CUSTOMER_POST_TRIP', 'SUPPLIER_POST_TRIP');

-- CreateEnum
CREATE TYPE "AiTaskType" AS ENUM ('EMAIL_PARSER', 'ENQUIRY_ANALYZER', 'SUPPLIER_SELECTOR', 'BID_EVALUATOR', 'MARKUP_CALCULATOR', 'QUOTE_CONTENT', 'JOB_DOCUMENTS', 'EMAIL_PERSONALIZER');

-- CreateEnum
CREATE TYPE "AiActionTaken" AS ENUM ('AUTO_EXECUTED', 'ESCALATED_TO_HUMAN', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "HumanReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "HumanReviewReason" AS ENUM ('LOW_CONFIDENCE', 'AI_FAILURE', 'POLICY_ESCALATION', 'LOW_SUPPLIER_RATING', 'ANOMALOUS_PRICING');

-- CreateEnum
CREATE TYPE "EnquirySource" AS ENUM ('WEBSITE', 'EMAIL', 'PHONE', 'API');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "organisationId" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganisationType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "website" TEXT,
    "vatNumber" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalJobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organisationId" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "capacity" INTEGER NOT NULL,
    "features" TEXT[],
    "insuranceExpiry" TIMESTAMP(3),
    "motExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organisationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "cpcExpiry" TIMESTAMP(3),
    "tachographCardNumber" TEXT,
    "tachographCardExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "source" "EnquirySource" NOT NULL DEFAULT 'WEBSITE',
    "sourceEmailId" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'SUBMITTED',
    "customerId" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION,
    "pickupLng" DOUBLE PRECISION,
    "dropoffLocation" TEXT,
    "dropoffLat" DOUBLE PRECISION,
    "dropoffLng" DOUBLE PRECISION,
    "tripType" "TripType" NOT NULL DEFAULT 'ONE_WAY',
    "departureDate" TIMESTAMP(3) NOT NULL,
    "departureTime" TEXT,
    "returnDate" TIMESTAMP(3),
    "returnTime" TEXT,
    "passengerCount" INTEGER NOT NULL,
    "vehicleType" "VehicleType",
    "specialRequirements" TEXT[],
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "additionalNotes" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "companyName" TEXT,
    "gdprConsent" BOOLEAN NOT NULL DEFAULT false,
    "aiComplexityScore" DOUBLE PRECISION,
    "aiSuggestedVehicle" "VehicleType",
    "aiEstimatedPriceMin" DOUBLE PRECISION,
    "aiEstimatedPriceMax" DOUBLE PRECISION,
    "aiQualityScore" DOUBLE PRECISION,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryStatusHistory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enquiryId" TEXT NOT NULL,
    "fromStatus" "EnquiryStatus",
    "toStatus" "EnquiryStatus" NOT NULL,
    "changedById" TEXT,
    "notes" TEXT,

    CONSTRAINT "EnquiryStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierEnquiry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "aiRank" INTEGER,
    "aiScore" DOUBLE PRECISION,
    "aiReasoning" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "SupplierEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierQuote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "supplierEnquiryId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "fuelSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tollCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parkingCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "vehicleId" TEXT,
    "vehicleOffered" TEXT,
    "notes" TEXT,
    "validUntil" TIMESTAMP(3),
    "status" "SupplierQuoteStatus" NOT NULL DEFAULT 'SUBMITTED',
    "aiFairnessScore" DOUBLE PRECISION,
    "aiRanking" INTEGER,
    "aiReasoning" TEXT,
    "aiAnomalyFlag" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SupplierQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerQuote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "supplierQuoteId" TEXT NOT NULL,
    "supplierPrice" DOUBLE PRECISION NOT NULL,
    "markupPercentage" DOUBLE PRECISION NOT NULL,
    "markupAmount" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "acceptanceToken" TEXT NOT NULL,
    "status" "CustomerQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "declineReason" TEXT,
    "aiMarkupReasoning" TEXT,
    "aiAcceptanceProbability" DOUBLE PRECISION,
    "aiDescription" TEXT,
    "aiEmailBody" TEXT,

    CONSTRAINT "CustomerQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "customerQuoteId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "supplierAccessToken" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "preTripData" JSONB,
    "preTripSubmittedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingStatusHistory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "changedById" TEXT,
    "notes" TEXT,

    CONSTRAINT "BookingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookingId" TEXT,
    "customerQuoteId" TEXT,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "description" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "organisationId" TEXT,
    "vehicleId" TEXT,
    "driverProfileId" TEXT,
    "bookingId" TEXT,
    "uploadedById" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SurveyType" NOT NULL,
    "description" TEXT,
    "questions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SurveyTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "respondentId" TEXT,
    "accessToken" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "overallRating" INTEGER,
    "comments" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequence" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDecisionLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskType" "AiTaskType" NOT NULL,
    "pipelineId" TEXT,
    "promptVersion" TEXT NOT NULL,
    "enquiryId" TEXT,
    "quoteId" TEXT,
    "bookingId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptMessages" JSONB NOT NULL,
    "rawResponse" JSONB NOT NULL,
    "parsedOutput" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "autoExecuted" BOOLEAN NOT NULL,
    "actionTaken" "AiActionTaken" NOT NULL,
    "escalatedReason" TEXT,
    "overriddenBy" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "overrideReason" TEXT,
    "overrideData" JSONB,
    "latencyMs" INTEGER NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL,
    "feedbackScore" INTEGER,
    "feedbackNotes" TEXT,

    CONSTRAINT "AiDecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanReviewTask" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taskType" "AiTaskType" NOT NULL,
    "enquiryId" TEXT,
    "reason" "HumanReviewReason" NOT NULL,
    "context" JSONB NOT NULL,
    "status" "HumanReviewStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" JSONB,
    "aiDecisionLogId" TEXT,

    CONSTRAINT "HumanReviewTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCostRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATE NOT NULL,
    "taskType" "AiTaskType" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "enquiryId" TEXT,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AiCostRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConfig" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,

    CONSTRAINT "AiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundEmail" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "rawHeaders" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "enquiryId" TEXT,
    "error" TEXT,

    CONSTRAINT "InboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_organisationId_idx" ON "User"("organisationId");

-- CreateIndex
CREATE INDEX "Organisation_type_idx" ON "Organisation"("type");

-- CreateIndex
CREATE INDEX "Organisation_rating_idx" ON "Organisation"("rating");

-- CreateIndex
CREATE INDEX "Vehicle_organisationId_idx" ON "Vehicle"("organisationId");

-- CreateIndex
CREATE INDEX "Vehicle_type_idx" ON "Vehicle"("type");

-- CreateIndex
CREATE INDEX "DriverProfile_organisationId_idx" ON "DriverProfile"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_referenceNumber_key" ON "Enquiry"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_sourceEmailId_key" ON "Enquiry"("sourceEmailId");

-- CreateIndex
CREATE INDEX "Enquiry_status_idx" ON "Enquiry"("status");

-- CreateIndex
CREATE INDEX "Enquiry_customerId_idx" ON "Enquiry"("customerId");

-- CreateIndex
CREATE INDEX "Enquiry_referenceNumber_idx" ON "Enquiry"("referenceNumber");

-- CreateIndex
CREATE INDEX "Enquiry_createdAt_idx" ON "Enquiry"("createdAt");

-- CreateIndex
CREATE INDEX "EnquiryStatusHistory_enquiryId_idx" ON "EnquiryStatusHistory"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierEnquiry_accessToken_key" ON "SupplierEnquiry"("accessToken");

-- CreateIndex
CREATE INDEX "SupplierEnquiry_accessToken_idx" ON "SupplierEnquiry"("accessToken");

-- CreateIndex
CREATE INDEX "SupplierEnquiry_enquiryId_idx" ON "SupplierEnquiry"("enquiryId");

-- CreateIndex
CREATE INDEX "SupplierEnquiry_organisationId_idx" ON "SupplierEnquiry"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierEnquiry_enquiryId_organisationId_key" ON "SupplierEnquiry"("enquiryId", "organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierQuote_supplierEnquiryId_key" ON "SupplierQuote"("supplierEnquiryId");

-- CreateIndex
CREATE INDEX "SupplierQuote_organisationId_idx" ON "SupplierQuote"("organisationId");

-- CreateIndex
CREATE INDEX "SupplierQuote_status_idx" ON "SupplierQuote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerQuote_referenceNumber_key" ON "CustomerQuote"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerQuote_acceptanceToken_key" ON "CustomerQuote"("acceptanceToken");

-- CreateIndex
CREATE INDEX "CustomerQuote_enquiryId_idx" ON "CustomerQuote"("enquiryId");

-- CreateIndex
CREATE INDEX "CustomerQuote_status_idx" ON "CustomerQuote"("status");

-- CreateIndex
CREATE INDEX "CustomerQuote_acceptanceToken_idx" ON "CustomerQuote"("acceptanceToken");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_referenceNumber_key" ON "Booking"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_customerQuoteId_key" ON "Booking"("customerQuoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_supplierAccessToken_key" ON "Booking"("supplierAccessToken");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_organisationId_idx" ON "Booking"("organisationId");

-- CreateIndex
CREATE INDEX "Booking_enquiryId_idx" ON "Booking"("enquiryId");

-- CreateIndex
CREATE INDEX "BookingStatusHistory_bookingId_idx" ON "BookingStatusHistory"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_organisationId_idx" ON "Document"("organisationId");

-- CreateIndex
CREATE INDEX "Document_bookingId_idx" ON "Document"("bookingId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_accessToken_key" ON "SurveyResponse"("accessToken");

-- CreateIndex
CREATE INDEX "SurveyResponse_bookingId_idx" ON "SurveyResponse"("bookingId");

-- CreateIndex
CREATE INDEX "SurveyResponse_templateId_idx" ON "SurveyResponse"("templateId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_key_idx" ON "Setting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_slug_key" ON "EmailTemplate"("slug");

-- CreateIndex
CREATE INDEX "EmailTemplate_slug_idx" ON "EmailTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_prefix_year_key" ON "Sequence"("prefix", "year");

-- CreateIndex
CREATE INDEX "AiDecisionLog_taskType_createdAt_idx" ON "AiDecisionLog"("taskType", "createdAt");

-- CreateIndex
CREATE INDEX "AiDecisionLog_enquiryId_idx" ON "AiDecisionLog"("enquiryId");

-- CreateIndex
CREATE INDEX "AiDecisionLog_pipelineId_idx" ON "AiDecisionLog"("pipelineId");

-- CreateIndex
CREATE INDEX "AiDecisionLog_actionTaken_createdAt_idx" ON "AiDecisionLog"("actionTaken", "createdAt");

-- CreateIndex
CREATE INDEX "HumanReviewTask_status_createdAt_idx" ON "HumanReviewTask"("status", "createdAt");

-- CreateIndex
CREATE INDEX "HumanReviewTask_taskType_status_idx" ON "HumanReviewTask"("taskType", "status");

-- CreateIndex
CREATE INDEX "AiCostRecord_date_taskType_idx" ON "AiCostRecord"("date", "taskType");

-- CreateIndex
CREATE INDEX "AiCostRecord_date_idx" ON "AiCostRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AiConfig_key_key" ON "AiConfig"("key");

-- CreateIndex
CREATE INDEX "AiConfig_key_idx" ON "AiConfig"("key");

-- CreateIndex
CREATE INDEX "InboundEmail_processed_createdAt_idx" ON "InboundEmail"("processed", "createdAt");

-- CreateIndex
CREATE INDEX "InboundEmail_fromEmail_idx" ON "InboundEmail"("fromEmail");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_sourceEmailId_fkey" FOREIGN KEY ("sourceEmailId") REFERENCES "InboundEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryStatusHistory" ADD CONSTRAINT "EnquiryStatusHistory_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEnquiry" ADD CONSTRAINT "SupplierEnquiry_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEnquiry" ADD CONSTRAINT "SupplierEnquiry_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuote" ADD CONSTRAINT "SupplierQuote_supplierEnquiryId_fkey" FOREIGN KEY ("supplierEnquiryId") REFERENCES "SupplierEnquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuote" ADD CONSTRAINT "SupplierQuote_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuote" ADD CONSTRAINT "SupplierQuote_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQuote" ADD CONSTRAINT "CustomerQuote_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerQuote" ADD CONSTRAINT "CustomerQuote_supplierQuoteId_fkey" FOREIGN KEY ("supplierQuoteId") REFERENCES "SupplierQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerQuoteId_fkey" FOREIGN KEY ("customerQuoteId") REFERENCES "CustomerQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerQuoteId_fkey" FOREIGN KEY ("customerQuoteId") REFERENCES "CustomerQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SurveyTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDecisionLog" ADD CONSTRAINT "AiDecisionLog_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanReviewTask" ADD CONSTRAINT "HumanReviewTask_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanReviewTask" ADD CONSTRAINT "HumanReviewTask_aiDecisionLogId_fkey" FOREIGN KEY ("aiDecisionLogId") REFERENCES "AiDecisionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
