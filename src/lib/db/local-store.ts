import {
  Scholarship,
  Application,
  StudentProfile,
  AuditLog,
  ScholarshipMetrics,
  ScholarshipCategory,
  VaultDocument,
  NotificationItem,
} from "./types";
import {
  initialScholarships,
  initialApplications,
  initialAuditLogs,
  initialStudent,
  initialVaultDocuments,
  initialNotifications,
  demoPersonas,
} from "./mock-data";
import { faker } from "@faker-js/faker";
import {
  cryptoLedger,
  LedgerBlock,
  VerificationProofResult,
} from "../integrations/crypto-ledger";
import {
  runIndianDocumentForensics,
  DocumentVerificationInput,
  DocumentVerificationReport,
  INDIAN_DOCUMENT_PRESETS,
} from "../integrations/indian-doc-verifier";

class ScholarshipStore {
  private scholarships: Scholarship[] = [...initialScholarships];
  private applications: Application[] = [...initialApplications];
  private logs: AuditLog[] = [...initialAuditLogs];
  private students: Map<string, StudentProfile> = new Map(
    demoPersonas.map((p) => [p.id, { ...p }])
  );
  private currentStudentId: string = "std-2026-01";
  private documents: VaultDocument[] = [...initialVaultDocuments];
  private notifications: NotificationItem[] = [...initialNotifications];

  // ===================== SCHOLARSHIP METHODS =====================
  getScholarships(): Scholarship[] {
    return [...this.scholarships];
  }

  getScholarshipById(id: string): Scholarship | undefined {
    return this.scholarships.find((s) => s.id === id);
  }

  addScholarshipDirect(sch: Scholarship): void {
    const existingIdx = this.scholarships.findIndex((s) => s.id === sch.id);
    if (existingIdx !== -1) {
      this.scholarships[existingIdx] = sch;
    } else {
      this.scholarships.unshift(sch);
    }
  }

  createScholarship(
    data: Omit<Scholarship, "id" | "remainingSlots" | "status" | "createdAt" | "updatedAt">
  ): Scholarship {
    const totalSlots = Number(data.totalSlots) || 1;
    const newScholarship: Scholarship = {
      ...data,
      id: `sch-${Date.now().toString().slice(-4)}`,
      totalSlots,
      remainingSlots: totalSlots,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.scholarships.unshift(newScholarship);
    this.addLog({
      action: "SCHOLARSHIP_CREATED",
      entity: "Scholarship",
      entityId: newScholarship.id,
      performedBy: data.createdBy || "Dr. Evelyn Vance (Admin)",
      details: `Created "${newScholarship.title}" with ${newScholarship.totalSlots} slots (₹${newScholarship.awardAmount.toLocaleString()}).`,
    });

    // Commit to Cryptographic On-Chain Ledger
    cryptoLedger.appendBlock(
      "Scholarship",
      newScholarship.id,
      "SCHOLARSHIP_CREATED",
      {
        title: newScholarship.title,
        slots: newScholarship.totalSlots,
        awardAmount: newScholarship.awardAmount,
        category: newScholarship.category,
      },
      data.createdBy || "Dr. Evelyn Vance (Admin)"
    );

    return newScholarship;
  }

  updateScholarship(id: string, updates: Partial<Scholarship>): Scholarship | null {
    const idx = this.scholarships.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    this.scholarships[idx] = {
      ...this.scholarships[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return this.scholarships[idx];
  }

  // ===================== APPLICATION METHODS =====================
  getApplications(scholarshipId?: string, studentEmail?: string): Application[] {
    let result = [...this.applications];
    if (scholarshipId) {
      result = result.filter((a) => a.scholarshipId === scholarshipId);
    }
    if (studentEmail) {
      result = result.filter((a) => a.studentEmail.toLowerCase() === studentEmail.toLowerCase());
    }
    return result;
  }

  getApplicationById(id: string): Application | undefined {
    return this.applications.find((a) => a.id === id);
  }

  clearApplications(): void {
    this.applications = [];
  }

  submitApplication(data: {
    scholarshipId: string;
    studentId?: string;
    studentName: string;
    studentEmail: string;
    studentDepartment: string;
    studentGpa: number;
    annualIncome: number;
    essay: string;
  }): { success: boolean; application?: Application; error?: string } {
    const scholarship = this.getScholarshipById(data.scholarshipId);
    if (!scholarship) {
      return { success: false, error: "Scholarship not found." };
    }

    if (scholarship.status === "CLOSED" || scholarship.remainingSlots <= 0) {
      return {
        success: false,
        error: "This scholarship is currently CLOSED and cannot accept new applications (all award slots filled).",
      };
    }

    // Check duplicate application
    const existing = this.applications.find(
      (a) =>
        a.scholarshipId === data.scholarshipId &&
        a.studentEmail.toLowerCase() === data.studentEmail.toLowerCase()
    );
    if (existing) {
      return {
        success: false,
        error: "You have already submitted an application for this scholarship. Track your status in My Applications.",
      };
    }

    const newApp: Application = {
      id: `app-${Date.now().toString().slice(-4)}`,
      scholarshipId: scholarship.id,
      scholarshipTitle: scholarship.title,
      studentId: data.studentId || "std-2026-01",
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      studentDepartment: data.studentDepartment,
      studentGpa: Number(data.studentGpa),
      annualIncome: Number(data.annualIncome),
      essay: data.essay,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.applications.unshift(newApp);

    this.addLog({
      action: "APPLICATION_SUBMITTED",
      entity: "Application",
      entityId: newApp.id,
      performedBy: data.studentName,
      details: `Submitted application for "${scholarship.title}". GPA: ${newApp.studentGpa}`,
    });

    // Commit to Cryptographic On-Chain Ledger
    cryptoLedger.appendBlock(
      "Application",
      newApp.id,
      "APPLICATION_SUBMITTED",
      {
        studentName: newApp.studentName,
        scholarshipTitle: scholarship.title,
        gpa: newApp.studentGpa,
        income: newApp.annualIncome,
      },
      `Student ${data.studentName} (${newApp.studentId})`
    );

    return { success: true, application: newApp };
  }

  reviewApplication(
    applicationId: string,
    status: "APPROVED" | "REJECTED" | "UNDER_REVIEW",
    reviewerName: string,
    reviewNotes?: string
  ): { success: boolean; application?: Application; error?: string } {
    const appIndex = this.applications.findIndex((a) => a.id === applicationId);
    if (appIndex === -1) {
      return { success: false, error: "Application not found." };
    }

    const app = this.applications[appIndex];
    const previousStatus = app.status;
    const scholarship = this.getScholarshipById(app.scholarshipId);

    if (!scholarship) {
      return { success: false, error: "Associated scholarship record missing." };
    }

    // Business Logic: If approving, check if slots are available
    if (status === "APPROVED" && previousStatus !== "APPROVED") {
      if (scholarship.remainingSlots <= 0) {
        return {
          success: false,
          error: `Cannot approve: "${scholarship.title}" has 0 remaining slots available.`,
        };
      }

      // Decrement slot
      scholarship.remainingSlots -= 1;
      if (scholarship.remainingSlots <= 0) {
        scholarship.status = "CLOSED";
        this.addLog({
          action: "SLOTS_EXHAUSTED",
          entity: "Scholarship",
          entityId: scholarship.id,
          performedBy: reviewerName,
          details: `All ${scholarship.totalSlots} slots awarded for "${scholarship.title}". Scholarship automatically CLOSED.`,
        });

        cryptoLedger.appendBlock(
          "Scholarship",
          scholarship.id,
          "AUTO_PROGRAM_CLOSED",
          {
            title: scholarship.title,
            reason: `All ${scholarship.totalSlots} award slots exhausted.`,
          },
          "Automated Disbursal Contract Daemon"
        );
      }

      scholarship.updatedAt = new Date().toISOString();
    }

    // If reverting an approved application back to rejected or under review, restore slot
    if (previousStatus === "APPROVED" && status !== "APPROVED") {
      scholarship.remainingSlots += 1;
      if (scholarship.status === "CLOSED" && scholarship.remainingSlots > 0) {
        scholarship.status = "OPEN";
      }
      scholarship.updatedAt = new Date().toISOString();
    }

    // Update application
    this.applications[appIndex] = {
      ...app,
      status,
      reviewedBy: reviewerName,
      reviewNotes: reviewNotes || (status === "APPROVED" ? "Approved based on criteria match." : "Rejected during committee review."),
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sanctionCode = `DBT-2026-${app.id.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;

    this.addLog({
      action: `APPLICATION_${status}`,
      entity: "Application",
      entityId: app.id,
      performedBy: reviewerName,
      details: `${status} award for ${app.studentName} on "${scholarship.title}". Remaining slots: ${scholarship.remainingSlots}/${scholarship.totalSlots}`,
    });

    // Commit cryptographic block for decision
    cryptoLedger.appendBlock(
      "Application",
      app.id,
      status === "APPROVED" ? "AWARD_APPROVED_AND_SLOT_DECREMENTED" : `APPLICATION_${status}`,
      {
        studentName: app.studentName,
        status,
        scholarshipId: scholarship.id,
        sanctionCode: status === "APPROVED" ? sanctionCode : undefined,
        slotsRemaining: scholarship.remainingSlots,
        reviewNotes: reviewNotes || "Evaluated by Institutional Review Board",
      },
      reviewerName
    );

    // Push real-time notification to the student
    this.addNotification({
      studentId: app.studentId,
      title: status === "APPROVED" ? "🎉 Scholarship Award Approved!" : status === "REJECTED" ? "Application Decision Update" : "Application Under Committee Review",
      message: status === "APPROVED"
        ? `Your application for "${scholarship.title}" has been APPROVED. Sanction Code: ${sanctionCode} (₹${scholarship.awardAmount.toLocaleString()}).`
        : status === "REJECTED"
        ? `Application for "${scholarship.title}" was not approved: ${reviewNotes || "Criteria threshold not satisfied."}`
        : `Your application for "${scholarship.title}" has moved to active committee evaluation.`,
      type: status === "APPROVED" ? "SUCCESS" : status === "REJECTED" ? "WARNING" : "INFO",
      read: false,
    });

    return { success: true, application: this.applications[appIndex] };
  }

  // ===================== SCHEME MANAGEMENT METHODS =====================
  deleteScholarship(id: string): boolean {
    const idx = this.scholarships.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    const removed = this.scholarships.splice(idx, 1)[0];
    this.addLog({
      action: "SCHOLARSHIP_DELETED",
      entity: "Scholarship",
      entityId: id,
      performedBy: "Dr. Evelyn Vance (Admin)",
      details: `Archived/Deleted scheme "${removed.title}".`,
    });
    return true;
  }

  toggleScholarshipStatus(id: string): Scholarship | null {
    const sch = this.getScholarshipById(id);
    if (!sch) return null;
    sch.status = sch.status === "OPEN" ? "CLOSED" : "OPEN";
    sch.updatedAt = new Date().toISOString();
    this.addLog({
      action: "SCHOLARSHIP_STATUS_TOGGLED",
      entity: "Scholarship",
      entityId: id,
      performedBy: "Dr. Evelyn Vance (Admin)",
      details: `Changed "${sch.title}" status to ${sch.status}.`,
    });
    return sch;
  }

  // ===================== VAULT DOCUMENT METHODS & FORENSICS =====================
  getDocuments(studentId?: string): VaultDocument[] {
    if (studentId) {
      return this.documents.filter((d) => d.studentId === studentId);
    }
    return [...this.documents];
  }

  addDocument(doc: Omit<VaultDocument, "id" | "verifiedAt">): VaultDocument {
    const newDoc: VaultDocument = {
      ...doc,
      id: `doc-${Date.now().toString().slice(-4)}`,
      verifiedAt: new Date().toISOString(),
    };
    this.documents.unshift(newDoc);
    this.addLog({
      action: "DOCUMENT_UPLOADED",
      entity: "VaultDocument",
      entityId: newDoc.id,
      performedBy: this.getStudentProfile(newDoc.studentId).fullName,
      details: `Uploaded document "${newDoc.title}" (${newDoc.verdict || "VERIFIED"}). Hash: ${newDoc.sha256Hash.substring(0, 10)}...`,
    });

    // Commit to Cryptographic On-Chain Ledger
    cryptoLedger.appendBlock(
      "VaultDocument",
      newDoc.id,
      "DOCUMENT_HASH_STAMPED",
      {
        title: newDoc.title,
        studentId: newDoc.studentId,
        verdict: newDoc.verdict,
        fraudRiskScore: newDoc.fraudRiskScore,
        sha256: newDoc.sha256Hash,
      },
      "Statutory Document Trust Gateway"
    );

    return newDoc;
  }

  uploadDocumentWithForensics(
    input: DocumentVerificationInput,
    studentId = "std-2026-01"
  ): { document: VaultDocument; report: DocumentVerificationReport } {
    const report = runIndianDocumentForensics(input);

    const newDoc: VaultDocument = {
      id: `doc-${Date.now().toString().slice(-4)}`,
      studentId,
      title: input.title,
      issuer: report.issuingAuthority,
      fileName: input.fileName || `${input.title.toLowerCase().replace(/\s+/g, "_")}.pdf`,
      fileSize: input.fileSize || "1.5 MB",
      fileType: input.documentType.replace(/_/g, " "),
      validity: report.validityStatus === "ACTIVE" ? "Valid & Attested" : "Flagged / Expired",
      sha256Hash: report.sha256Hash,
      isVerified: report.verdict === "GENUINE_VERIFIED",
      verifiedAt: new Date().toISOString(),
      verdict: report.verdict,
      fraudRiskScore: report.fraudRiskScore,
      extractedIdentifier: report.extractedIdentifier,
      tamperSummary: report.tamperSummary,
      checks: report.checks.map((c) => ({
        checkName: c.checkName,
        passed: c.passed,
        details: c.details,
      })),
      fileUrl: input.fileUrl,
      cloudinaryPublicId: input.cloudinaryPublicId,
    };

    this.documents.unshift(newDoc);

    this.addLog({
      action: report.verdict === "FRAUD_REJECTED" ? "DOCUMENT_FRAUD_BLOCKED" : "DOCUMENT_VERIFIED",
      entity: "VaultDocument",
      entityId: newDoc.id,
      performedBy: "AI Indian Document Forensics Engine",
      details: `${report.verdict}: "${newDoc.title}" (Risk Score: ${report.fraudRiskScore}%).`,
    });

    cryptoLedger.appendBlock(
      "VaultDocument",
      newDoc.id,
      report.verdict === "FRAUD_REJECTED" ? "DOCUMENT_FRAUD_FLAGGED" : "DOCUMENT_HASH_STAMPED",
      {
        title: newDoc.title,
        verdict: report.verdict,
        riskScore: report.fraudRiskScore,
        sha256: report.sha256Hash,
      },
      "AI Indian Document Forensics Gateway"
    );

    return { document: newDoc, report };
  }

  seedDocumentPreset(presetIndex: number, studentId?: string): { document: VaultDocument; report: DocumentVerificationReport } | null {
    const preset = INDIAN_DOCUMENT_PRESETS[presetIndex];
    if (!preset) return null;
    const targetStudent = this.getStudentProfile(studentId);

    return this.uploadDocumentWithForensics(
      {
        documentType: preset.type,
        title: preset.title,
        identifier: preset.identifier,
        extractedName: preset.extractedName,
        declaredStudentName: targetStudent.fullName,
        extractedIncome: (preset as any).extractedIncome,
        declaredIncome: targetStudent.annualIncome,
        extractedGpa: (preset as any).extractedGpa,
        declaredGpa: targetStudent.gpa,
        issuingAuthority: preset.issuingAuthority,
        expiryDate: (preset as any).expiryDate,
        fileName: preset.fileName,
        fileSize: "1.6 MB",
      },
      targetStudent.id
    );
  }

  deleteDocument(id: string): boolean {
    const idx = this.documents.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    this.documents.splice(idx, 1);
    return true;
  }

  syncDigiLocker(studentId: string): { success: boolean; syncedCount: number; timestamp: string } {
    const studentDocs = this.documents.filter((d) => d.studentId === studentId);
    studentDocs.forEach((d) => {
      d.isVerified = true;
      d.verifiedAt = new Date().toISOString();
      d.verdict = "GENUINE_VERIFIED";
    });

    this.addLog({
      action: "DIGILOCKER_SYNC",
      entity: "StudentProfile",
      entityId: studentId,
      performedBy: "DigiLocker Trust Gateway",
      details: `Re-synchronized ${studentDocs.length} statutory records with state registry.`,
    });

    cryptoLedger.appendBlock(
      "StudentProfile",
      studentId,
      "DIGILOCKER_REGISTRY_SYNC",
      { recordsSynced: studentDocs.length },
      "National DigiLocker Trust Gateway (SSO-GOV)"
    );

    return {
      success: true,
      syncedCount: studentDocs.length,
      timestamp: new Date().toISOString(),
    };
  }

  // ===================== CRYPTOGRAPHIC LEDGER ACCESS =====================
  getLedgerBlocks(): LedgerBlock[] {
    return cryptoLedger.getChain();
  }

  verifyLedgerRecord(query: string): VerificationProofResult {
    return cryptoLedger.verifyRecord(query);
  }

  checkLedgerIntegrity() {
    return cryptoLedger.checkChainIntegrity();
  }

  simulateDBTDisbursal(
    applicationId: string,
    officerName = "Dr. Evelyn Vance (Chair)"
  ): { success: boolean; block?: LedgerBlock; txHash?: string; error?: string } {
    const app = this.getApplicationById(applicationId);
    if (!app) return { success: false, error: "Application not found." };
    if (app.status !== "APPROVED") {
      return { success: false, error: "Only approved applications can receive DBT grant disbursal." };
    }

    const sch = this.getScholarshipById(app.scholarshipId);
    const amount = sch ? sch.awardAmount : 10000;
    const sanctionCode = `DBT-2026-${app.id.toUpperCase()}`;

    const block = cryptoLedger.appendBlock(
      "DisbursalMandate",
      sanctionCode,
      "DBT_FUNDS_DISBURSED",
      {
        applicationId: app.id,
        studentName: app.studentName,
        scholarshipTitle: sch?.title || app.scholarshipTitle,
        amount,
        bankBridge: "NPCI Aadhaar Payment Bridge (APB)",
        sanctionCode,
      },
      officerName
    );

    this.addLog({
      action: "DBT_DISBURSED",
      entity: "DisbursalMandate",
      entityId: sanctionCode,
      performedBy: officerName,
      details: `Disbursed ₹${amount.toLocaleString()} grant to ${app.studentName} via NPCI DBT Gateway. Block #${block.blockHeight}`,
    });

    this.addNotification({
      studentId: app.studentId,
      title: "💰 DBT Scholarship Funds Disbursed!",
      message: `₹${amount.toLocaleString()} has been transferred to your Aadhaar-linked bank account (Sanction: ${sanctionCode}).`,
      type: "SUCCESS",
      read: false,
    });

    return { success: true, block, txHash: block.blockHash };
  }

  // ===================== NOTIFICATIONS METHODS =====================
  getNotifications(studentId?: string): NotificationItem[] {
    if (studentId) {
      return this.notifications.filter((n) => n.studentId === studentId);
    }
    return [...this.notifications];
  }

  markNotificationRead(id: string): boolean {
    const notif = this.notifications.find((n) => n.id === id);
    if (!notif) return false;
    notif.read = true;
    return true;
  }

  addNotification(notif: Omit<NotificationItem, "id" | "createdAt">): NotificationItem {
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(newNotif);
    return newNotif;
  }

  // ===================== METRICS & TELEMETRY =====================
  getMetrics(): ScholarshipMetrics {
    const totalScholarships = this.scholarships.length;
    const activeOpenScholarships = this.scholarships.filter((s) => s.status === "OPEN").length;
    const totalApplications = this.applications.length;
    const pendingReviews = this.applications.filter((a) => a.status === "PENDING" || a.status === "UNDER_REVIEW").length;
    const approvedAwards = this.applications.filter((a) => a.status === "APPROVED").length;

    let totalFundingAllocated = 0;
    this.applications
      .filter((a) => a.status === "APPROVED")
      .forEach((app) => {
        const s = this.getScholarshipById(app.scholarshipId);
        if (s) totalFundingAllocated += Number(s.awardAmount);
      });

    const totalSlotsCombined = this.scholarships.reduce((acc, s) => acc + s.totalSlots, 0);
    const remainingSlotsTotal = this.scholarships.reduce((acc, s) => acc + s.remainingSlots, 0);
    const slotsAwarded = totalSlotsCombined - remainingSlotsTotal;
    const slotUtilizationRate = totalSlotsCombined > 0 ? (slotsAwarded / totalSlotsCombined) * 100 : 0;

    return {
      totalScholarships,
      activeOpenScholarships,
      totalApplications,
      pendingReviews,
      approvedAwards,
      totalFundingAllocated,
      remainingSlotsTotal,
      slotUtilizationRate: Math.round(slotUtilizationRate * 10) / 10,
    };
  }

  getStudentProfile(studentId?: string): StudentProfile {
    const targetId = studentId || this.currentStudentId;
    const found = this.students.get(targetId);
    if (found) return { ...found };
    const byEmail = Array.from(this.students.values()).find((s) => s.email === targetId);
    if (byEmail) return { ...byEmail };
    return { ...(demoPersonas[0] || initialStudent) };
  }

  switchStudentPersona(studentId: string): StudentProfile {
    if (this.students.has(studentId)) {
      this.currentStudentId = studentId;
    } else {
      const byEmail = Array.from(this.students.values()).find((s) => s.email === studentId);
      if (byEmail) {
        this.currentStudentId = byEmail.id;
      }
    }
    return this.getStudentProfile(this.currentStudentId);
  }

  updateStudentProfile(updates: Partial<StudentProfile>, studentId?: string) {
    const targetId = studentId || this.currentStudentId;
    const existing = this.getStudentProfile(targetId);
    const updated = { ...existing, ...updates };
    this.students.set(targetId, updated);
  }

  getLogs(limit = 15): AuditLog[] {
    return this.logs.slice(0, limit);
  }

  private addLog(log: Omit<AuditLog, "id" | "timestamp">) {
    this.logs.unshift({
      ...log,
      id: `log-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
    });
  }

  seedRandomScholarship(): Scholarship {
    const categories: ScholarshipCategory[] = [
      "Academic Merit",
      "Financial Need",
      "STEM & Research",
      "Diversity & Leadership",
      "Community Impact",
    ];
    const total = faker.number.int({ min: 2, max: 6 });
    const award = faker.helpers.arrayElement([50000, 75000, 100000, 125000, 180000, 250000]);

    return this.createScholarship({
      title: `${faker.company.name()} ${faker.helpers.arrayElement([
        "Excellence Fellowship",
        "National Impact Grant",
        "Future Leaders Award",
        "Socio-Economic Access Grant",
      ])}`,
      description: faker.lorem.paragraph(2),
      category: faker.helpers.arrayElement(categories),
      awardAmount: award,
      totalSlots: total,
      deadline: new Date(Date.now() + 86400000 * faker.number.int({ min: 10, max: 45 })).toISOString(),
      minGpa: faker.helpers.arrayElement([3.0, 3.25, 3.5, 3.75]),
      maxIncome: faker.helpers.arrayElement([250000, 500000, 800000, null]),
      eligibleDepartments: ["All Departments"],
      createdBy: "Dr. Evelyn Vance (Admin)",
    });
  }

  resetToDefaults() {
    this.scholarships = [...initialScholarships];
    this.applications = [...initialApplications];
    this.logs = [...initialAuditLogs];
    this.students = new Map(demoPersonas.map((p) => [p.id, { ...p }]));
    this.currentStudentId = "std-2026-01";
    this.documents = [...initialVaultDocuments];
    this.notifications = [...initialNotifications];
  }
}

declare global {
  var __ps78_scholarship_store__: ScholarshipStore | undefined;
}

export const scholarshipStore =
  globalThis.__ps78_scholarship_store__ ?? new ScholarshipStore();
if (process.env.NODE_ENV !== "production") {
  globalThis.__ps78_scholarship_store__ = scholarshipStore;
}
