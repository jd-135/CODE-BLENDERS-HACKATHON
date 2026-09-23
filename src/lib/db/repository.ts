import { scholarshipStore } from "./local-store";
import { supabase, isSupabaseConfigured } from "../supabase/client";
import { Scholarship, Application, StudentProfile, AuditLog, ScholarshipMetrics, VaultDocument, NotificationItem } from "./types";

export interface ScholarshipRepository {
  getProviderName(): "Local Store (Offline Engine)" | "Supabase Cloud";
  isOffline(): boolean;
  getScholarships(): Promise<Scholarship[]>;
  getScholarshipById(id: string): Promise<Scholarship | null>;
  createScholarship(
    data: Omit<Scholarship, "id" | "remainingSlots" | "status" | "createdAt" | "updatedAt">
  ): Promise<Scholarship>;
  updateScholarship(id: string, updates: Partial<Scholarship>): Promise<Scholarship | null>;
  deleteScholarship(id: string): Promise<boolean>;
  toggleScholarshipStatus(id: string): Promise<Scholarship | null>;
  getApplications(scholarshipId?: string, studentEmail?: string): Promise<Application[]>;
  getApplicationById(id: string): Promise<Application | null>;
  submitApplication(data: {
    scholarshipId: string;
    studentId?: string;
    studentName: string;
    studentEmail: string;
    studentDepartment: string;
    studentGpa: number;
    annualIncome: number;
    essay: string;
  }): Promise<{ success: boolean; application?: Application; error?: string }>;
  reviewApplication(
    applicationId: string,
    status: "APPROVED" | "REJECTED" | "UNDER_REVIEW",
    reviewerName: string,
    reviewNotes?: string
  ): Promise<{ success: boolean; application?: Application; error?: string }>;
  getDocuments(studentId?: string): Promise<VaultDocument[]>;
  addDocument(doc: Omit<VaultDocument, "id" | "verifiedAt">): Promise<VaultDocument>;
  uploadDocumentWithForensics(input: any, studentId?: string): Promise<{ document: VaultDocument; report: any }>;
  seedDocumentPreset(presetIndex: number, studentId?: string): Promise<{ document: VaultDocument; report: any } | null>;
  deleteDocument(id: string): Promise<boolean>;
  syncDigiLocker(studentId: string): Promise<{ success: boolean; syncedCount: number; timestamp: string }>;
  getNotifications(studentId?: string): Promise<NotificationItem[]>;
  markNotificationRead(id: string): Promise<boolean>;
  addNotification(notif: Omit<NotificationItem, "id" | "createdAt">): Promise<NotificationItem>;
  getMetrics(): Promise<ScholarshipMetrics>;
  getStudentProfile(studentId?: string): Promise<StudentProfile>;
  switchStudentPersona(studentId: string): Promise<StudentProfile>;
  updateStudentProfile(updates: Partial<StudentProfile>, studentId?: string): Promise<void>;
  getLogs(limit?: number): Promise<AuditLog[]>;
  getLedgerBlocks(): Promise<any[]>;
  verifyLedgerRecord(query: string): Promise<any>;
  checkLedgerIntegrity(): Promise<any>;
  simulateDBTDisbursal(applicationId: string, officerName?: string): Promise<any>;
  seedRandomScholarship(): Promise<Scholarship>;
  resetDefaults(): Promise<void>;
}


function mapScholarshipFromDb(row: any): Scholarship {
  return {
    id: String(row.id),
    title: row.title || "Scholarship Program",
    description: row.description || "",
    category: row.category || "STEM & Research",
    awardAmount: Number(row.award_amount ?? row.awardAmount ?? 5000),
    totalSlots: Number(row.total_slots ?? row.totalSlots ?? 1),
    remainingSlots: Number(row.remaining_slots ?? row.remainingSlots ?? 0),
    status: row.status || "OPEN",
    deadline: row.deadline || new Date().toISOString(),
    minGpa: Number(row.min_gpa ?? row.minGpa ?? 0),
    maxIncome:
      row.max_income !== null && row.max_income !== undefined
        ? Number(row.max_income)
        : row.maxIncome !== null && row.maxIncome !== undefined
        ? Number(row.maxIncome)
        : null,
    eligibleDepartments: Array.isArray(row.eligible_departments)
      ? row.eligible_departments
      : Array.isArray(row.eligibleDepartments)
      ? row.eligibleDepartments
      : ["All Departments"],
    createdBy: row.created_by || row.createdBy || "admissions@scholarhub.edu",
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapApplicationFromDb(row: any, allScholarships: Scholarship[] = []): Application {
  const matchedSch = allScholarships.find((s) => s.id === (row.scholarship_id || row.scholarshipId));
  return {
    id: String(row.id),
    scholarshipId: row.scholarship_id || row.scholarshipId || "",
    scholarshipTitle:
      row.scholarship_title ||
      row.scholarshipTitle ||
      matchedSch?.title ||
      "Scholarship Award",
    studentId: row.student_id || row.studentId || "std-001",
    studentName: row.student_name || row.studentName || "Student Applicant",
    studentEmail: row.student_email || row.studentEmail || "student@university.edu",
    studentDepartment: row.student_department || row.studentDepartment || "Computer Science",
    studentGpa: Number(row.student_gpa ?? row.studentGpa ?? 3.5),
    annualIncome: Number(row.annual_income ?? row.annualIncome ?? 40000),
    essay: row.essay_statement || row.essay || "",
    status: row.status || "PENDING",
    reviewedBy: row.reviewed_by || row.reviewedBy,
    reviewNotes: row.review_notes || row.reviewNotes,
    reviewedAt: row.reviewed_at || row.reviewedAt,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapProfileFromDb(row: any): StudentProfile {
  return {
    id: String(row.id),
    email: row.email || "student@university.edu",
    fullName: row.full_name || row.fullName || "Student User",
    department: row.department || "Computer Science",
    gpa: Number(row.gpa ?? 3.5),
    annualIncome: Number(row.annual_income ?? row.annualIncome ?? 45000),
    enrollmentYear: Number(row.enrollment_year ?? row.enrollmentYear ?? 2024),
  };
}

function mapLogFromDb(row: any): AuditLog {
  return {
    id: String(row.id),
    action: row.action || "SYSTEM_EVENT",
    entity: row.entity || "SCHOLARSHIP",
    entityId: row.entity_id || row.entityId || "",
    performedBy: row.performed_by || row.performedBy || "System",
    details: row.details || "",
    timestamp: row.created_at || row.timestamp || new Date().toISOString(),
  };
}

class HybridScholarshipRepository implements ScholarshipRepository {
  private useSupabase: boolean;

  constructor() {
    this.useSupabase =
      process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" && isSupabaseConfigured();
  }

  getProviderName(): "Local Store (Offline Engine)" | "Supabase Cloud" {
    return this.useSupabase ? "Supabase Cloud" : "Local Store (Offline Engine)";
  }

  isOffline(): boolean {
    return !this.useSupabase;
  }

  async getScholarships(): Promise<Scholarship[]> {
    if (this.useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from("scholarships")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) return data.map(mapScholarshipFromDb);
      } catch {
        console.warn("[Repository] Supabase fetch failed, falling back to Local Store.");
      }
    }
    return scholarshipStore.getScholarships();
  }

  async getScholarshipById(id: string): Promise<Scholarship | null> {
    if (this.useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from("scholarships")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) return mapScholarshipFromDb(data);
      } catch {
        console.warn("[Repository] Supabase single fetch failed, falling back to Local Store.");
      }
    }
    return scholarshipStore.getScholarshipById(id) || null;
  }

  async createScholarship(
    data: Omit<Scholarship, "id" | "remainingSlots" | "status" | "createdAt" | "updatedAt">
  ): Promise<Scholarship> {
    if (this.useSupabase && supabase) {
      try {
        const payload = {
          title: data.title,
          description: data.description,
          category: data.category,
          award_amount: data.awardAmount,
          total_slots: data.totalSlots,
          remaining_slots: data.totalSlots,
          status: "OPEN",
          deadline: data.deadline,
          min_gpa: data.minGpa,
          max_income: data.maxIncome,
          eligible_departments: data.eligibleDepartments,
          created_by: data.createdBy,
        };

        const { data: created, error } = await supabase
          .from("scholarships")
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error("[Repository] Supabase create error:", error);
        } else if (created) {
          const mapped = mapScholarshipFromDb(created);
          scholarshipStore.addScholarshipDirect(mapped);
          return mapped;
        }
      } catch (err) {
        console.error("[Repository] Supabase create failed:", err);
      }
    }
    return scholarshipStore.createScholarship(data);
  }

  async updateScholarship(id: string, updates: Partial<Scholarship>): Promise<Scholarship | null> {
    if (this.useSupabase && supabase) {
      try {
        const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
        if (updates.awardAmount !== undefined) dbUpdates.award_amount = updates.awardAmount;
        if (updates.totalSlots !== undefined) dbUpdates.total_slots = updates.totalSlots;
        if (updates.remainingSlots !== undefined) dbUpdates.remaining_slots = updates.remainingSlots;
        if (updates.minGpa !== undefined) dbUpdates.min_gpa = updates.minGpa;
        if (updates.maxIncome !== undefined) dbUpdates.max_income = updates.maxIncome;
        if (updates.eligibleDepartments !== undefined) dbUpdates.eligible_departments = updates.eligibleDepartments;

        const { data, error } = await supabase
          .from("scholarships")
          .update(dbUpdates)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("[Repository] Supabase update error:", error);
        } else if (data) {
          const mapped = mapScholarshipFromDb(data);
          scholarshipStore.addScholarshipDirect(mapped);
          return mapped;
        }
      } catch (err) {
        console.error("[Repository] Supabase update failed:", err);
      }
    }
    return scholarshipStore.updateScholarship(id, updates);
  }

  async deleteScholarship(id: string): Promise<boolean> {
    if (this.useSupabase && supabase) {
      try {
        const { error } = await supabase.from("scholarships").delete().eq("id", id);
        if (error) {
          console.error("[Repository] Supabase delete error:", error);
        }
      } catch (err) {
        console.error("[Repository] Supabase delete failed:", err);
      }
    }
    return scholarshipStore.deleteScholarship(id);
  }

  async toggleScholarshipStatus(id: string): Promise<Scholarship | null> {
    if (this.useSupabase && supabase) {
      try {
        const current = await this.getScholarshipById(id);
        if (current) {
          const nextStatus = current.status === "OPEN" ? "CLOSED" : "OPEN";
          const { data, error } = await supabase
            .from("scholarships")
            .update({ status: nextStatus, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single();

          if (error) {
            console.error("[Repository] Supabase toggle error:", error);
          } else if (data) {
            const mapped = mapScholarshipFromDb(data);
            scholarshipStore.addScholarshipDirect(mapped);
            return mapped;
          }
        }
      } catch (err) {
        console.error("[Repository] Supabase toggle failed:", err);
      }
    }
    return scholarshipStore.toggleScholarshipStatus(id);
  }

  async getApplications(scholarshipId?: string, studentEmail?: string): Promise<Application[]> {
    if (this.useSupabase && supabase) {
      try {
        let query = supabase.from("applications").select("*").order("created_at", { ascending: false });
        if (scholarshipId) query = query.eq("scholarship_id", scholarshipId);
        if (studentEmail) query = query.eq("student_email", studentEmail);
        const { data, error } = await query;
        if (!error && data) {
          const currentScholarships = await this.getScholarships();
          return data.map((d) => mapApplicationFromDb(d, currentScholarships));
        }
      } catch {
        console.warn("[Repository] Supabase applications query failed, falling back to Local Store.");
      }
    }
    return scholarshipStore.getApplications(scholarshipId, studentEmail);
  }

  async getApplicationById(id: string): Promise<Application | null> {
    if (this.useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from("applications")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) {
          const currentScholarships = await this.getScholarships();
          return mapApplicationFromDb(data, currentScholarships);
        }
      } catch {
        console.warn("[Repository] Supabase getApplicationById failed, falling back to Local Store.");
      }
    }
    return scholarshipStore.getApplicationById(id) || null;
  }

  async submitApplication(data: {
    scholarshipId: string;
    studentId?: string;
    studentName: string;
    studentEmail: string;
    studentDepartment: string;
    studentGpa: number;
    annualIncome: number;
    essay: string;
  }): Promise<{ success: boolean; application?: Application; error?: string }> {
    if (this.useSupabase && supabase) {
      try {
        const payload = {
          scholarship_id: data.scholarshipId,
          student_id: data.studentId && data.studentId.includes("-") && data.studentId.length === 36 ? data.studentId : null,
          student_name: data.studentName,
          student_email: data.studentEmail,
          student_department: data.studentDepartment,
          student_gpa: data.studentGpa,
          annual_income: data.annualIncome,
          essay_statement: data.essay,
          status: "PENDING",
        };

        const { data: created, error } = await supabase
          .from("applications")
          .insert([payload])
          .select()
          .single();
        if (!error && created) {
          const currentScholarships = await this.getScholarships();
          return { success: true, application: mapApplicationFromDb(created, currentScholarships) };
        }
        if (error) return { success: false, error: error.message };
      } catch {
        console.warn("[Repository] Supabase submit failed, falling back to Local Store.");
      }
    }
    return scholarshipStore.submitApplication(data);
  }

  async reviewApplication(
    applicationId: string,
    status: "APPROVED" | "REJECTED" | "UNDER_REVIEW",
    reviewerName: string,
    reviewNotes?: string
  ): Promise<{ success: boolean; application?: Application; error?: string }> {
    if (this.useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from("applications")
          .update({
            status,
            reviewed_by: reviewerName,
            review_notes: reviewNotes,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", applicationId)
          .select()
          .single();
        if (!error && data) {
          const currentScholarships = await this.getScholarships();
          return { success: true, application: mapApplicationFromDb(data, currentScholarships) };
        }
      } catch {
        console.warn("[Repository] Supabase review failed, falling back to Local Store.");
      }
    }
    return scholarshipStore.reviewApplication(applicationId, status, reviewerName, reviewNotes);
  }

  async clearAllApplications(): Promise<{ success: boolean }> {
    if (this.useSupabase && supabase) {
      try {
        await supabase.from("applications").delete().neq("id", "none");
      } catch (err) {
        console.warn("[Repository] Supabase delete applications failed:", err);
      }
    }
    scholarshipStore.clearApplications();
    return { success: true };
  }

  async getDocuments(studentId?: string): Promise<VaultDocument[]> {
    return scholarshipStore.getDocuments(studentId);
  }

  async addDocument(doc: Omit<VaultDocument, "id" | "verifiedAt">): Promise<VaultDocument> {
    return scholarshipStore.addDocument(doc);
  }

  async uploadDocumentWithForensics(input: any, studentId?: string): Promise<{ document: VaultDocument; report: any }> {
    return scholarshipStore.uploadDocumentWithForensics(input, studentId);
  }

  async seedDocumentPreset(presetIndex: number, studentId?: string): Promise<{ document: VaultDocument; report: any } | null> {
    return scholarshipStore.seedDocumentPreset(presetIndex, studentId);
  }

  async deleteDocument(id: string): Promise<boolean> {
    return scholarshipStore.deleteDocument(id);
  }

  async syncDigiLocker(studentId: string): Promise<{ success: boolean; syncedCount: number; timestamp: string }> {
    return scholarshipStore.syncDigiLocker(studentId);
  }

  async getNotifications(studentId?: string): Promise<NotificationItem[]> {
    return scholarshipStore.getNotifications(studentId);
  }

  async markNotificationRead(id: string): Promise<boolean> {
    return scholarshipStore.markNotificationRead(id);
  }

  async addNotification(notif: Omit<NotificationItem, "id" | "createdAt">): Promise<NotificationItem> {
    return scholarshipStore.addNotification(notif);
  }

  async getMetrics(): Promise<ScholarshipMetrics> {
    if (this.useSupabase && supabase) {
      try {
        const [schRes, appRes] = await Promise.all([
          supabase.from("scholarships").select("*"),
          supabase.from("applications").select("*"),
        ]);
        if (!schRes.error && !appRes.error && schRes.data && appRes.data) {
          const schList = schRes.data.map(mapScholarshipFromDb);
          const appList = appRes.data.map((d) => mapApplicationFromDb(d, schList));
          const totalScholarships = schList.length;
          const activeOpenScholarships = schList.filter((s) => s.status === "OPEN").length;
          const totalApplications = appList.length;
          const pendingReviews = appList.filter((a) => a.status === "PENDING" || a.status === "UNDER_REVIEW").length;
          const approvedAwards = appList.filter((a) => a.status === "APPROVED").length;
          const totalSlots = schList.reduce((acc, s) => acc + s.totalSlots, 0);
          const remainingSlotsTotal = schList.reduce((acc, s) => acc + s.remainingSlots, 0);
          const totalFundingAllocated = schList.reduce((acc, s) => acc + (s.awardAmount * (s.totalSlots - s.remainingSlots)), 0);
          const slotUtilizationRate = totalSlots > 0 ? ((totalSlots - remainingSlotsTotal) / totalSlots) * 100 : 0;

          return {
            totalScholarships,
            activeOpenScholarships,
            totalApplications,
            pendingReviews,
            approvedAwards,
            totalFundingAllocated,
            remainingSlotsTotal,
            slotUtilizationRate: Math.round(slotUtilizationRate),
          };
        }
      } catch {
        console.warn("[Repository] Supabase getMetrics failed, falling back to Local Store.");
      }
    }
    return scholarshipStore.getMetrics();
  }

  async getStudentProfile(studentId?: string): Promise<StudentProfile> {
    if (this.useSupabase && supabase) {
      try {
        let q = supabase.from("profiles").select("*");
        if (studentId) {
          q = q.eq("id", studentId);
        } else {
          q = q.eq("role", "STUDENT");
        }
        const { data, error } = await q.limit(1).single();
        if (!error && data) return mapProfileFromDb(data);
      } catch {
        console.warn("[Repository] Supabase profile fetch failed, falling back to Local Store.");
      }
    }
    return scholarshipStore.getStudentProfile(studentId);
  }

  async switchStudentPersona(studentId: string): Promise<StudentProfile> {
    return scholarshipStore.switchStudentPersona(studentId);
  }

  async updateStudentProfile(updates: Partial<StudentProfile>, studentId?: string): Promise<void> {
    scholarshipStore.updateStudentProfile(updates, studentId);
  }

  async getLogs(limit?: number): Promise<AuditLog[]> {
    if (this.useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit || 8);
        if (!error && data) return data.map(mapLogFromDb);
      } catch {
        console.warn("[Repository] Supabase getLogs failed, falling back to Local Store.");
      }
    }
    return scholarshipStore.getLogs(limit);
  }

  async getLedgerBlocks(): Promise<any[]> {
    return scholarshipStore.getLedgerBlocks();
  }

  async verifyLedgerRecord(query: string): Promise<any> {
    return scholarshipStore.verifyLedgerRecord(query);
  }

  async checkLedgerIntegrity(): Promise<any> {
    return scholarshipStore.checkLedgerIntegrity();
  }

  async simulateDBTDisbursal(applicationId: string, officerName?: string): Promise<any> {
    return scholarshipStore.simulateDBTDisbursal(applicationId, officerName);
  }

  async seedRandomScholarship(): Promise<Scholarship> {
    const newSch = scholarshipStore.seedRandomScholarship();
    if (this.useSupabase && supabase) {
      try {
        await this.createScholarship(newSch);
      } catch {}
    }
    return newSch;
  }

  async resetDefaults(): Promise<void> {
    scholarshipStore.resetToDefaults();
  }
}

export const db: ScholarshipRepository = new HybridScholarshipRepository();
