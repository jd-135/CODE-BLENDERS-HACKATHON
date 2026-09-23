import { z } from "zod";

export const ScholarshipCategoryEnum = z.enum([
  "STEM & Research",
  "Need-Based Financial Aid",
  "Merit & Leadership",
  "Women in Tech & Engineering",
  "First-Generation Scholars",
  "Arts & Humanities",
  "Disabled & Special Categories",
]);

export const ScholarshipStatusEnum = z.enum(["OPEN", "CLOSED", "PAUSED", "ARCHIVED"]);

export const ApplicationStatusEnum = z.enum([
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "DISBURSED",
]);

export const IndianDocTypeEnum = z.enum([
  "AADHAAR_CARD",
  "INCOME_CERTIFICATE",
  "CASTE_COMMUNITY_CERT",
  "COLLEGE_ID",
  "MARKSHEET_TRANSCRIPT",
  "DOMICILE_CERTIFICATE",
  "BANK_PASSBOOK",
]);

export const ScholarshipSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: ScholarshipCategoryEnum,
  awardAmount: z.number().positive("Award amount must be greater than 0"),
  totalSlots: z.number().int().positive("Total slots must be at least 1"),
  remainingSlots: z.number().int().nonnegative().optional(),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid ISO date string"),
  minGpa: z.number().min(0).max(10, "GPA must be between 0.0 and 10.0").default(0),
  maxIncome: z.number().positive().nullable().optional(),
  eligibleDepartments: z.array(z.string()).min(1, "At least one department must be specified"),
  status: ScholarshipStatusEnum.default("OPEN"),
  createdBy: z.string().email("Must be a valid staff email").optional(),
});

export const ApplicationSubmissionSchema = z.object({
  scholarshipId: z.string().min(1, "Scholarship ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
  studentName: z.string().min(2, "Student name is required"),
  studentEmail: z.string().email("Valid student email required"),
  studentDepartment: z.string().min(2, "Department is required"),
  studentGpa: z.number().min(0).max(10, "GPA must be between 0.0 and 10.0"),
  annualIncome: z.number().nonnegative("Annual income must be 0 or positive"),
  essay: z.string().min(20, "Essay must contain at least 20 characters").max(5000),
  verifiedDocIds: z.array(z.string()).optional(),
});

export const DocumentUploadSchema = z.object({
  documentType: IndianDocTypeEnum,
  title: z.string().min(3, "Document title is required"),
  identifier: z.string().min(3, "Statutory identifier is required"),
  fileName: z.string().min(1, "File name is required"),
  fileSize: z.string().min(1, "File size is required"),
  extractedName: z.string().optional(),
  declaredStudentName: z.string().min(2, "Declared student name is required"),
  extractedIncome: z.number().nonnegative().optional(),
  declaredIncome: z.number().nonnegative().optional(),
  extractedGpa: z.number().min(0).max(10).optional(),
  declaredGpa: z.number().min(0).max(10).optional(),
  expiryDate: z.string().optional(),
  issuingAuthority: z.string().optional(),
});

export const StudentProfileSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(2),
  email: z.string().email(),
  rollNo: z.string().min(3),
  department: z.string().min(2),
  gpa: z.number().min(0).max(10),
  annualIncome: z.number().nonnegative(),
  category: z.string(),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
  phone: z.string().optional(),
  digiLockerVerified: z.boolean().default(false),
});
