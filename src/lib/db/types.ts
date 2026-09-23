// PS78: Scholarship Application Management System Domain Types

export type ScholarshipCategory =
  | "Academic Merit"
  | "Financial Need"
  | "STEM & Research"
  | "Diversity & Leadership"
  | "Community Impact";

export type ScholarshipStatus = "OPEN" | "CLOSED" | "ARCHIVED";

export type ApplicationStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export interface Scholarship {
  id: string;
  title: string;
  description: string;
  category: ScholarshipCategory;
  awardAmount: number;
  totalSlots: number;
  remainingSlots: number;
  status: ScholarshipStatus;
  deadline: string;
  minGpa: number;
  maxIncome?: number | null;
  eligibleDepartments: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  scholarshipId: string;
  scholarshipTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentDepartment: string;
  studentGpa: number;
  annualIncome: number;
  essay: string;
  status: ApplicationStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  email: string;
  fullName: string;
  department: string;
  gpa: number;
  annualIncome: number;
  enrollmentYear: number;
  rollNo?: string;
  category?: string;
  aadhaarNumber?: string;
  phone?: string;
  digiLockerVerified?: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export interface VaultDocument {
  id: string;
  studentId: string;
  title: string;
  issuer: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  validity: string;
  sha256Hash: string;
  metricLabel?: string;
  metricValue?: string;
  isVerified: boolean;
  verifiedAt: string;
  verdict?: "GENUINE_VERIFIED" | "SUSPICIOUS_FLAGGED" | "FRAUD_REJECTED";
  fraudRiskScore?: number;
  extractedIdentifier?: string;
  tamperSummary?: string;
  checks?: {
    checkName: string;
    passed: boolean;
    details: string;
  }[];
  fileUrl?: string;
  cloudinaryPublicId?: string;
}

export interface NotificationItem {
  id: string;
  studentId: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "DECISION";
  read: boolean;
  createdAt: string;
}

export interface ScholarshipMetrics {
  totalScholarships: number;
  activeOpenScholarships: number;
  totalApplications: number;
  pendingReviews: number;
  approvedAwards: number;
  totalFundingAllocated: number;
  remainingSlotsTotal: number;
  slotUtilizationRate: number;
}


