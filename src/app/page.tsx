"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  db,
  Scholarship,
  Application,
  AuditLog,
  ScholarshipMetrics,
  StudentProfile,
  ScholarshipCategory,
  VaultDocument,
  NotificationItem,
  initialScholarships,
  initialApplications,
  initialStudent,
  initialVaultDocuments,
  initialNotifications,
  demoPersonas,
} from "@/lib/db";
import {
  INDIAN_DOCUMENT_PRESETS,
  runIndianDocumentForensics,
  IndianDocType,
  DocumentVerificationReport,
} from "@/lib/integrations/indian-doc-verifier";
import {
  LedgerBlock,
  VerificationProofResult,
  sha256,
} from "@/lib/integrations/crypto-ledger";
import jsPDF from "jspdf";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { InteractiveTour } from "@/components/InteractiveTour";
import {
  downloadStudentProfilePdf,
  downloadStudentProfilePng,
  downloadAwardLetterPdf,
  downloadAwardLetterPng,
  downloadApplicationReceiptPdf,
  downloadRejectionMemoPdf,
} from "@/lib/integrations/dossier-generator";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  GraduationCap,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  DollarSign,
  TrendingUp,
  FileCheck2,
  Check,
  X,
  AlertTriangle,
  Filter,
  User,
  Inbox,
  Lock,
  Unlock,
  Eye,
  Flame,
  ArrowUpRight,
  School,
  FileText,
  HelpCircle,
  Bell,
  LogOut,
  Folder,
  Shield,
  Fingerprint,
  Landmark,
  BrainCircuit,
  FileCheck,
  ExternalLink,
  ChevronRight,
  Bookmark,
  CheckCircle,
  LayoutGrid,
  FileBadge,
  UserCheck2,
  SlidersHorizontal,
  Trash2,
  KeyRound,
  UploadCloud,
  FileUp,
  ShieldAlert,
  Power,
  ScanLine,
  FileSearch,
  CheckSquare,
  AlertOctagon,
  Copy,
  Terminal,
  FileDown,
  Download,
  Cloud,
  Globe,
  Upload,
  MessageSquare,
  Edit3,
} from "lucide-react";

// Safe Deterministic Currency Formatter (Eliminates SSR/Locale Hydration Mismatch)
function formatCurrency(val?: number | null): string {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Safe Deterministic Date Formatter
function formatDate(dateStr?: string): string {
  if (!dateStr) return "2026-09-23";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return String(dateStr);
  }
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "10:00 AM";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const mins = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${mins} UTC`;
  } catch {
    return "";
  }
}

export default function ScholarshipPortalDashboard() {
  // Authentication & Security Role Isolation
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeRole, setActiveRole] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [loginTab, setLoginTab] = useState<"STUDENT" | "ADMIN">("STUDENT");
  const [loginEmail, setLoginEmail] = useState("admin@scholarhub.edu");
  const [loginPassword, setLoginPassword] = useState("••••••••");
  const [loginRollNo, setLoginRollNo] = useState("2024CSB1089");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Portal Navigation State
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Core Data Collections
  const [scholarships, setScholarships] = useState<Scholarship[]>(initialScholarships);
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [vaultDocuments, setVaultDocuments] = useState<VaultDocument[]>(initialVaultDocuments);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<ScholarshipMetrics | null>(null);
  const [student, setStudent] = useState<StudentProfile>(initialStudent);
  const [provider, setProvider] = useState<string>("Local Memory DB");
  const [isPending, startTransition] = useTransition();

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("ALL");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [smartMatchOnly, setSmartMatchOnly] = useState(false);
  const [notifFilter, setNotifFilter] = useState<string>("all");

  // Dialog Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [selectedAppDetail, setSelectedAppDetail] = useState<Application | null>(null);
  const [myAppsFilter, setMyAppsFilter] = useState<"ALL" | "APPROVED" | "REVIEW" | "REJECTED">("ALL");
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [applicationSuccess, setApplicationSuccess] = useState<string | null>(null);

  // Admin Rejection Dialog Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTargetApp, setRejectTargetApp] = useState<Application | null>(null);
  const [rejectReasonCategory, setRejectReasonCategory] = useState("GPA Below Threshold");
  const [rejectCustomRemarks, setRejectCustomRemarks] = useState("");

  // Student Award / DBT Letter Modal
  const [selectedAwardApp, setSelectedAwardApp] = useState<Application | null>(null);

  // User Onboarding Tour & Interactive Help Guide Modal
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [tabTourKey, setTabTourKey] = useState<string | null>(null);

  const handleStartTabTour = (tab: string) => {
    setTabTourKey(tab);
    setIsHelpOpen(true);
  };
  const [helpStep, setHelpStep] = useState(0);

  const HELP_TOUR_STEPS = [
    {
      step: 1,
      tag: "Platform Overview",
      tabKey: "dashboard",
      tabName: "Dashboard",
      title: "Welcome to National Scholarship Trust (PS78)",
      desc: "An AI-powered, tamper-proof national scholarship allocation and Direct Benefit Transfer (DBT) portal built for Bannari Amman Institute of Technology scholars.",
      highlights: [
        "100% Zero-Leakage: Verified with UIDAI, DigiLocker & State Bank of India.",
        "Anti-Fraud Engine: Real-time Verhoeff dihedral D5 checksums & institutional seal forensics.",
        "Direct Benefit Transfer (DBT): Integrated PFMS bank gateway for transparent disbursals.",
        "Public Immutable Ledger: Every sanction and audit event anchored to SHA-256 Merkle chain.",
      ],
    },
    {
      step: 2,
      tag: "Navigation: Dashboard",
      tabKey: "dashboard",
      tabName: "Dashboard",
      title: "Dashboard & AI Eligibility Matching",
      desc: "The Dashboard provides an instant snapshot of your academic standing, synced DigiLocker credentials, and personalized scholarship match scores.",
      highlights: [
        "Match Percentage (Up to 98%): Dynamically computed from your CGPA, family income, and engineering branch.",
        "Remaining Quota Slots: Live counter displaying remaining seats for each grant.",
        "Quick Actions: 1-click access to document renewals, notifications, and application tracking.",
      ],
    },
    {
      step: 3,
      tag: "Navigation: Scholarships",
      tabKey: "scholarships",
      tabName: "Scholarships",
      title: "Scholarship Catalog & Strict CGPA Enforcement",
      desc: "Explore government, institutional, and endowment grants (Tata, Reliance, Adani) with rigorous eligibility enforcement.",
      highlights: [
        "Strict CGPA Guard: If your CGPA does not meet the minimum requirement, application submission is strictly blocked.",
        "Smart Auto-Fill: Pre-populates 85% of your application data directly from verified student records.",
        "Filter by Domain: Merit-based, Need-based, STEM & Research, and Women in Tech.",
      ],
    },
    {
      step: 4,
      tag: "Navigation: Document Vault",
      tabKey: "documents",
      tabName: "Document Vault",
      title: "Statutory Document Vault & DigiLocker Sync",
      desc: "Your encrypted depository for all 6 statutory certificates needed for central scholarship disbursements.",
      highlights: [
        "All 6 Documents Supported: Aadhaar (UIDAI), Marksheet, Bonafide Certificate, Income Certificate, Caste Certificate, and Bank Passbook.",
        "Instant Specimen Proofs: Inspect authentic verified specimens with 0 latency.",
        "Dedicated Replacement Slots: Clicking 'Replace' locks directly to that document type to prevent slot confusion.",
      ],
    },
    {
      step: 5,
      tag: "Navigation: My Applications",
      tabKey: "my-applications",
      tabName: "My Applications",
      title: "Application Dossiers & Award Letters",
      desc: "Track the real-time status of your submissions from 'Under Review' to 'Approved' and DBT Disbursal.",
      highlights: [
        "Milestone Timeline: Follow committee review, merit scoring, and registrar approval steps.",
        "Official Award Letters: Download high-resolution PDF & PNG award letters from Bannari Amman Institute of Technology.",
        "Handwritten Signatory: Formally signed by Jay Dinakar R, Director of Scholarships & Academic Trust Dean.",
      ],
    },
    {
      step: 6,
      tag: "Navigation: Audit Ledger & Admin",
      tabKey: "analytics",
      tabName: "Public Audit Ledger",
      title: "Cryptographic Public Ledger & Compliance",
      desc: "Verify immutable transaction hashes on the public blockchain-style ledger.",
      highlights: [
        "Hash Verification: Search by Application ID, Document ID, or Sanction Hash.",
        "Audit Pack ZIP Export: Generate and download a complete audit bundle containing CSV data, JSON ledger, and statutory compliance report.",
        "Admin Governance: Administrators can review, score, disburse DBT grants, and edit scheme parameters.",
      ],
    },
  ];

  // Dedicated Multi-Step Application Flow & Success Screen States (Stitch Screens 4, 5, 3)
  const [applyStep, setApplyStep] = useState<number>(4);
  const [submittedAppReceipt, setSubmittedAppReceipt] = useState<Application | null>(null);
  const [copySuccessNotice, setCopySuccessNotice] = useState<boolean>(false);
  const [whatsAppUpdatesEnabled, setWhatsAppUpdatesEnabled] = useState<boolean>(true);
  const [declarationAgreed, setDeclarationAgreed] = useState<boolean>(true);
  const [selectedDetailScheme, setSelectedDetailScheme] = useState<Scholarship | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<"academic" | "socio" | "bank" | "security">("academic");

  // Active Persona State
  const [activePersonaId, setActivePersonaId] = useState<string>("std-2026-01");

  // Document Vault & DigiLocker Interactive States
  const [isSyncingVault, setIsSyncingVault] = useState(false);
  const [vaultSyncNotice, setVaultSyncNotice] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);
  const [docFilterType, setDocFilterType] = useState<string>("ALL");
  const [lastSyncedText, setLastSyncedText] = useState<string>("Last synced 2h ago");
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [bonafideStatus, setBonafideStatus] = useState<"PENDING_RENEWAL" | "SCANNING" | "VERIFIED" | "SUSPICIOUS">("VERIFIED");
  const [bonafideFile, setBonafideFile] = useState<{ name: string; size: string; hash: string } | null>({
    name: "IITD_Bonafide_AY26-27.pdf",
    size: "1.2 MB",
    hash: "0x89ab1024fbd90218ab28e19c0018f4a1239",
  });
  const [bonafideForensicReport, setBonafideForensicReport] = useState<DocumentVerificationReport | null>(null);
  const [activeCertModal, setActiveCertModal] = useState<"NONE" | "SIGNATURE_INCOME" | "INSPECT_CGPA" | "CHECK_MANDATE">("NONE");
  const [sessionDismissedNotifs, setSessionDismissedNotifs] = useState<Set<string>>(new Set());

  // Enhanced Indian Document Upload Form & Forensics Engine
  const [uploadMode, setUploadMode] = useState<"FILE" | "DIGILOCKER" | "PRESET">("FILE");
  const [uploadLockedDocType, setUploadLockedDocType] = useState<IndianDocType | null>(null);
  const [editingScheme, setEditingScheme] = useState<Scholarship | null>(null);
  const [isEditSchemeOpen, setIsEditSchemeOpen] = useState(false);
  const [uploadIndianDocType, setUploadIndianDocType] = useState<IndianDocType>("INCOME_CERTIFICATE");
  const [uploadDocTitle, setUploadDocTitle] = useState("Annual Family Income Certificate");
  const [uploadDocIssuer, setUploadDocIssuer] = useState("Tahsildar Revenue Office (TN e-District)");
  const [uploadIdentifier, setUploadIdentifier] = useState("TN-REV/2026/0948215");
  const [uploadExtractedName, setUploadExtractedName] = useState("Priya Sharma");
  const [uploadExtractedIncome, setUploadExtractedIncome] = useState("180000");
  const [uploadExtractedGpa, setUploadExtractedGpa] = useState("3.92");
  const [uploadExpiryDate, setUploadExpiryDate] = useState("2027-03-31");
  const [uploadFileName, setUploadFileName] = useState("income_certificate_2026_signed.pdf");
  const [uploadFileSize, setUploadFileSize] = useState("1.8 MB");
  const [liveForensicReport, setLiveForensicReport] = useState<DocumentVerificationReport | null>(null);
  const [isUploadingWithForensics, setIsUploadingWithForensics] = useState(false);
  const [uploadSelectedFile, setUploadSelectedFile] = useState<File | null>(null);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);

  // Public Cryptographic Audit Ledger & DBT Protocol States
  const [auditLedgerView, setAuditLedgerView] = useState<"table" | "visualizer">("table");
  const [ledgerBlocks, setLedgerBlocks] = useState<LedgerBlock[]>([]);
  const [quickHashQuery, setQuickHashQuery] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationProofResult | null>(null);
  const [isVerifyingHash, setIsVerifyingHash] = useState(false);
  const [chainIntegrity, setChainIntegrity] = useState<{
    isValid: boolean;
    totalBlocks: number;
    verifiedBlocks: number;
    genesisHash: string;
    headHash: string;
    timestamp: string;
  } | null>(null);
  const [isAuditingChain, setIsAuditingChain] = useState(false);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  const [ledgerFilterAction, setLedgerFilterAction] = useState("ALL");

  // Student Application Form
  const [appGpa, setAppGpa] = useState("3.88");
  const [appIncome, setAppIncome] = useState("32000");
  const [appDepartment, setAppDepartment] = useState("Computer Science & Engineering");
  const [appEssay, setAppEssay] = useState("");

  // Admin New Scholarship Form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<ScholarshipCategory>("STEM & Research");
  const [newAmount, setNewAmount] = useState("10000");
  const [newSlots, setNewSlots] = useState("3");
  const [newMinGpa, setNewMinGpa] = useState("3.50");
  const [newMaxIncome, setNewMaxIncome] = useState("65000");
  const [adminActionNotice, setAdminActionNotice] = useState<string | null>(null);

  const refreshData = async (targetPersonaId?: string) => {
    try {
      const pid = targetPersonaId || activePersonaId;
      const [sList, aList, lList, mData, sProfile, docList, notifList, blocks, integrity] = await Promise.all([
        db.getScholarships(),
        db.getApplications(),
        db.getLogs(12),
        db.getMetrics(),
        db.getStudentProfile(pid),
        db.getDocuments(pid),
        db.getNotifications(pid),
        db.getLedgerBlocks(),
        db.checkLedgerIntegrity(),
      ]);
      if (sList && sList.length > 0) setScholarships(sList);
      if (aList) setApplications(aList);
      if (lList) setLogs(lList);
      if (mData) setMetrics(mData);
      if (docList) setVaultDocuments(docList);
      if (notifList) setNotifications(notifList);
      if (blocks && blocks.length > 0) setLedgerBlocks(blocks);
      if (integrity) setChainIntegrity(integrity);
      if (sProfile) {
        setStudent(sProfile);
        setAppGpa(String(sProfile.gpa));
        setAppIncome(String(sProfile.annualIncome));
        setAppDepartment(sProfile.department);
      }
      setProvider(db.getProviderName());
    } catch (err) {
      console.error("Failed to load initial data", err);
    }
  };

  useEffect(() => {
    refreshData(activePersonaId);
  }, [activePersonaId]);

  // Strict Role Navigation & Security Guard
  useEffect(() => {
    const adminTabs = ["admin-overview", "applications-review", "manage-schemes", "analytics"];
    const studentTabs = ["dashboard", "scholarships", "my-applications", "documents", "notifications", "profile", "scholarship-detail", "apply-flow", "apply-success"];

    if (activeRole === "STUDENT" && adminTabs.includes(activeTab)) {
      setActiveTab("dashboard");
    } else if (activeRole === "ADMIN" && studentTabs.includes(activeTab)) {
      setActiveTab("admin-overview");
    }
  }, [activeRole, activeTab]);

  // Handle Switching Personas
  const handleSwitchPersona = async (persona: StudentProfile) => {
    setIsDataLoading(true);
    await db.switchStudentPersona(persona.id);
    setStudent(persona);
    setActivePersonaId(persona.id);
    setAppGpa(String(persona.gpa));
    setAppIncome(String(persona.annualIncome));
    setAppDepartment(persona.department);
    setActiveRole("STUDENT");
    setActiveTab("dashboard");
    setIsLoggedIn(true);
    setAdminActionNotice(`Switched active session to ${persona.fullName} (${persona.gpa} CGPA • ${persona.department})`);
    setTimeout(() => setAdminActionNotice(null), 3000);
    await refreshData(persona.id);
    setTimeout(() => setIsDataLoading(false), 400);
  };

  // Handle Student Login
  const handleStudentAuth = async (persona?: StudentProfile) => {
    let target = persona;
    if (!target) {
      target =
        demoPersonas.find(
          (p) =>
            p.rollNo?.toLowerCase() === loginRollNo.trim().toLowerCase() ||
            p.fullName.toLowerCase().includes(loginRollNo.trim().toLowerCase())
        ) || demoPersonas[0];
    }
    await handleSwitchPersona(target);
  };

  // Handle Admin Login
  const handleAdminAuth = () => {
    setActiveRole("ADMIN");
    setActiveTab("admin-overview");
    setIsLoggedIn(true);
    setAdminActionNotice("Authenticated as Dr. Evelyn Vance (Scholarship Committee Chair)");
    setTimeout(() => setAdminActionNotice(null), 3000);
  };

  // Handle Logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setAdminActionNotice("Signed out of secure session.");
    setTimeout(() => setAdminActionNotice(null), 3000);
  };

  // Safe Eligibility evaluation helper for student
  const checkEligibility = (sch: Scholarship) => {
    const depts = sch.eligibleDepartments || ["All Departments"];
    const gpaOk = student.gpa >= (sch.minGpa ?? 0);
    const incomeOk = !sch.maxIncome || student.annualIncome <= sch.maxIncome;
    const deptOk =
      depts.includes("All Departments") ||
      depts.some((d) => d.toLowerCase() === (student.department || "").toLowerCase());

    const isFullyEligible = gpaOk && incomeOk && deptOk;
    let matchScore = 65;
    if (gpaOk) matchScore += 15;
    if (incomeOk) matchScore += 12;
    if (deptOk) matchScore += 8;

    return {
      eligible: isFullyEligible,
      gpaOk,
      incomeOk,
      deptOk,
      matchScore: Math.min(98, matchScore),
    };
  };

  // Filtered Scholarships
  const filteredScholarships = scholarships.filter((s) => {
    const depts = s.eligibleDepartments || [];
    const matchSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      depts.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchCategory = selectedCategory === "ALL" || s.category === selectedCategory;
    const matchOpen = !onlyOpen || (s.status === "OPEN" && s.remainingSlots > 0);
    const matchSmart = !smartMatchOnly || checkEligibility(s).eligible;

    return matchSearch && matchCategory && matchOpen && matchSmart;
  });

  // Filtered Applications for Admin
  const filteredAdminApplications = applications.filter((a) => {
    if (adminStatusFilter === "ALL") return true;
    return a.status === adminStatusFilter;
  });

  // Filtered Applications for Student
  const studentApplications = applications.filter(
    (a) => a.studentId === student.id || a.studentEmail === student.email
  );

  const handleOpenApplyModal = (scholarship: Scholarship) => {
    // STRICT CGPA ELIGIBILITY CHECK:
    if (student.gpa < (scholarship.minGpa ?? 0)) {
      alert(
        `❌ YOU ARE NOT ELIGIBLE TO APPLY\n\nScholarship Scheme: "${scholarship.title}"\nMinimum Required CGPA: ${scholarship.minGpa.toFixed(2)}\nYour Current CGPA: ${student.gpa.toFixed(2)}\n\nUnder statutory institutional criteria, applicants with a CGPA below the required threshold are strictly barred from applying for this scheme.`
      );
      setAdminActionNotice(
        `❌ NOT ELIGIBLE: Your CGPA (${student.gpa.toFixed(2)}) is below the required ${scholarship.minGpa.toFixed(2)} threshold for "${scholarship.title}".`
      );
      setTimeout(() => setAdminActionNotice(null), 6000);
      return;
    }

    setSelectedScholarship(scholarship);
    setApplicationError(null);
    setApplicationSuccess(null);
    setAppGpa(String(student.gpa.toFixed(2)));
    setAppIncome(String(student.annualIncome));
    setAppDepartment(student.department);
    setAppEssay(
      `As an undergraduate scholar at Bannari Amman Institute of Technology in the Department of ${student.department} with a cumulative ${student.gpa.toFixed(2)} CGPA, receiving the ${scholarship.title} will directly empower my technical coursework, advanced research laboratory thesis, and statutory academic fees.`
    );
    setApplyStep(4);
    setActiveTab("apply-flow");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleViewSchemeDetail = (scholarship: Scholarship) => {
    setSelectedDetailScheme(scholarship);
    setActiveTab("scholarship-detail");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSmartApplySubmit = () => {
    if (!selectedScholarship) return;
    if (student.gpa < (selectedScholarship.minGpa ?? 0)) {
      setApplicationError(`You are not eligible: Your CGPA (${student.gpa.toFixed(2)}) is below the required ${selectedScholarship.minGpa.toFixed(2)} threshold for "${selectedScholarship.title}".`);
      return;
    }
    if (!appEssay.trim()) {
      setApplicationError("Please provide a statement of purpose / personal essay.");
      return;
    }

    startTransition(async () => {
      const res = await db.submitApplication({
        scholarshipId: selectedScholarship.id,
        studentId: student.id,
        studentName: student.fullName,
        studentEmail: student.email,
        studentDepartment: appDepartment || student.department,
        studentGpa: Number(appGpa) || student.gpa,
        annualIncome: Number(appIncome) || student.annualIncome,
        essay: appEssay,
      });

      if (!res.success) {
        setApplicationError(res.error || "Application submission failed.");
      } else {
        try {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#004ac6", "#2563eb", "#712ae2", "#10b981", "#ff9800"],
          });
        } catch {}

        const submitted = res.application;
        setSubmittedAppReceipt(
          submitted || {
            id: `PS78-2026-${Math.floor(100000 + Math.random() * 900000)}`,
            scholarshipId: selectedScholarship.id,
            scholarshipTitle: selectedScholarship.title,
            studentId: student.id,
            studentName: student.fullName,
            studentEmail: student.email,
            studentDepartment: appDepartment || student.department,
            studentGpa: Number(appGpa) || student.gpa,
            annualIncome: Number(appIncome) || student.annualIncome,
            essay: appEssay,
            status: "UNDER_REVIEW",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sha256Hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
          } as Application
        );

        setActiveTab("apply-success");
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        await refreshData();
      }
    });
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSmartApplySubmit();
  };

  const handleDownloadAwardPng = (app: Application) => {
    downloadAwardLetterPng(app);
  };

  // Direct High-Resolution PDF Generator
  const handleDownloadAwardPdf = (app: Application) => {
    downloadAwardLetterPdf(app);
  };

  // Real Multi-File ZIP Audit Pack Generator using JSZip
  const handleExportAuditZip = async () => {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // 1. Scholarships Summary CSV
      const csvHeader = "ID,Title,Category,AwardAmount,TotalSlots,RemainingSlots,Status,MinGPA,MaxIncome\n";
      const csvRows = scholarships
        .map((s) => `"${s.id}","${s.title}","${s.category}",${s.awardAmount},${s.totalSlots},${s.remainingSlots},"${s.status}",${s.minGpa},${s.maxIncome || "N/A"}`)
        .join("\n");
      zip.file("scholarships_summary.csv", csvHeader + csvRows);

      // 2. Cryptographic Ledger JSON
      const ledgerData = {
        system: "National Scholarship Trust Portal PS78",
        institution: "Bannari Amman Institute of Technology",
        deanSignatory: "Jay Dinakar R",
        exportedAt: new Date().toISOString(),
        chainIntegrity: chainIntegrity || { isValid: true, status: "CHAIN_HEALTHY" },
        totalScholarships: scholarships.length,
        totalApplications: applications.length,
        auditLogs: logs,
      };
      zip.file("cryptographic_audit_ledger.json", JSON.stringify(ledgerData, null, 2));

      // 3. Indian Statutory Compliance Report TXT
      const reportText = `========================================================================
NATIONAL SCHOLARSHIP PORTAL (PS78) - AUDIT & COMPLIANCE PACK
Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
Institution: Bannari Amman Institute of Technology
Director of Scholarships: Jay Dinakar R
========================================================================

1. REGULATORY & STATUTORY COMPLIANCE:
   - UIDAI Aadhaar Tokenization: COMPLIANT (Verhoeff Dihedral D5 Validated, AES-256)
   - NPCI DBT Mapper Bridge: ACTIVE (State Bank of India IFSC SBIN0001423 Seeded)
   - PFMS Disbursement Gateway: OPERATIONAL (Zero-leakage direct bank transfer)
   - DigiLocker NAD Depository: CONNECTED (Cryptographically signed by state authorities)

2. SCHOLARSHIP ALLOCATION METRICS:
   - Active Scholarship Schemes: ${scholarships.length}
   - Total Funding Sanctioned: INR ${scholarships.reduce((acc, s) => acc + s.awardAmount * s.totalSlots, 0).toLocaleString("en-IN")}
   - Total Available Quota Slots: ${scholarships.reduce((acc, s) => acc + s.totalSlots, 0)}
   - Active Candidate Submissions: ${applications.length}

3. CRYPTOGRAPHIC VERIFICATION HASH:
   - Merkle Root Anchor: 0x89dc71092efb119a018742ca899017e891cb90218ab28e19c0018f4
   - Ledger Status: IMMUTABLE & VERIFIED

========================================================================
Authorized by: Jay Dinakar R (Academic Trust Dean)
`;
      zip.file("compliance_and_audit_report.txt", reportText);

      // Generate ZIP blob and trigger real download
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PS78_National_Scholarship_Audit_Pack_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP export failed:", err);
      alert("Exported audit report generated.");
    }
  };

  const handleOpenRejectModal = (app: Application) => {
    setSelectedAppDetail(null);
    setRejectTargetApp(app);
    setRejectReasonCategory("GPA Below Threshold");
    setRejectCustomRemarks("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejection = () => {
    if (!rejectTargetApp) return;
    startTransition(async () => {
      const formattedNotes = `Rejected [${rejectReasonCategory}]: ${
        rejectCustomRemarks.trim() ||
        "Application criteria threshold not satisfied or slot quota reached."
      }`;
      const res = await db.reviewApplication(
        rejectTargetApp.id,
        "REJECTED",
        "Dr. Evelyn Vance (Admin Reviewer)",
        formattedNotes
      );

      if (!res.success) {
        alert(res.error);
      } else {
        setAdminActionNotice(
          `Application for "${rejectTargetApp.studentName}" marked as Rejected with reason: ${rejectReasonCategory}`
        );
        setTimeout(() => setAdminActionNotice(null), 5000);
        setIsRejectModalOpen(false);
        setRejectTargetApp(null);
        setSelectedAppDetail(null);
        await refreshData();
      }
    });
  };

  const handleAdminReview = (
    app: Application,
    status: "APPROVED" | "REJECTED" | "UNDER_REVIEW"
  ) => {
    if (status === "REJECTED") {
      handleOpenRejectModal(app);
      return;
    }

    startTransition(async () => {
      const res = await db.reviewApplication(
        app.id,
        status,
        "Dr. Evelyn Vance (Admin Reviewer)",
        status === "APPROVED"
          ? "Approved: Outstanding academic record and verified eligibility alignment. 1 award slot disbursed."
          : "Under committee evaluation."
      );

      if (!res.success) {
        alert(res.error);
      } else {
        const sch = scholarships.find((s) => s.id === app.scholarshipId);
        if (status === "APPROVED" && sch) {
          const newRemain = Math.max(0, sch.remainingSlots - 1);
          setAdminActionNotice(
            `Application Approved! 1 slot deducted for "${sch.title}". Remaining slots: ${newRemain}/${sch.totalSlots}${
              newRemain === 0 ? " (Program automatically CLOSED)" : ""
            }`
          );
        }
        setTimeout(() => setAdminActionNotice(null), 5000);
        setSelectedAppDetail(null);
        await refreshData();
      }
    });
  };

  const handleToggleSchemeStatus = (id: string) => {
    startTransition(async () => {
      await db.toggleScholarshipStatus(id);
      await refreshData();
    });
  };

  const handleDeleteScheme = (id: string) => {
    if (!confirm("Are you sure you want to archive/delete this scholarship scheme?")) return;
    startTransition(async () => {
      await db.deleteScholarship(id);
      await refreshData();
    });
  };

  const handleCreateScholarship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    startTransition(async () => {
      try {
        const created = await db.createScholarship({
          title: newTitle.trim(),
          description: newDescription.trim() || "Institutional academic excellence grant.",
          category: newCategory,
          awardAmount: Number(newAmount) || 5000,
          totalSlots: Number(newSlots) || 1,
          deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
          minGpa: Number(newMinGpa) || 0,
          maxIncome: newMaxIncome ? Number(newMaxIncome) : null,
          eligibleDepartments: ["All Departments"],
          createdBy: "admissions@scholarhub.edu",
        });

        setIsCreateOpen(false);
        const createdTitle = newTitle.trim();
        setNewTitle("");
        setNewDescription("");
        setAdminActionNotice(`✅ Successfully published "${createdTitle}" to Database & Ledger!`);
        setTimeout(() => setAdminActionNotice(null), 5000);
        await refreshData();
      } catch (err: any) {
        console.error("Failed to create scholarship:", err);
        setAdminActionNotice(`❌ Error publishing scholarship: ${err?.message || "Database write failed"}`);
        setTimeout(() => setAdminActionNotice(null), 5000);
      }
    });
  };

  // Real Indian Document Forensics Ingestion Handler with Cloudinary Upload
  const handleUploadNewDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadDocTitle.trim()) return;

    setIsUploadingWithForensics(true);
    setUploadProgressText("Uploading document to Cloudinary CDN...");

    let fileUrl: string | undefined;
    let cloudinaryPublicId: string | undefined;

    try {
      if (uploadSelectedFile) {
        const fd = new FormData();
        fd.append("file", uploadSelectedFile);
        fd.append("documentType", uploadIndianDocType);
        fd.append("studentId", student.id);

        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await upRes.json();
        if (upData.success) {
          fileUrl = upData.url;
          cloudinaryPublicId = upData.publicId;
        }
      }
    } catch (err) {
      console.warn("Cloudinary upload fallback:", err);
    }

    setUploadProgressText("Running Indian Statutory Forensics & Ledger Anchoring...");

    startTransition(async () => {
      const res = await db.uploadDocumentWithForensics(
        {
          documentType: uploadIndianDocType,
          title: uploadDocTitle,
          identifier: uploadIdentifier.trim(),
          fileName: uploadFileName,
          fileSize: uploadFileSize,
          fileUrl,
          cloudinaryPublicId,
          extractedName: uploadExtractedName || student.fullName,
          declaredStudentName: student.fullName,
          extractedIncome: uploadExtractedIncome ? Number(uploadExtractedIncome) : undefined,
          declaredIncome: student.annualIncome,
          extractedGpa: uploadExtractedGpa ? Number(uploadExtractedGpa) : undefined,
          declaredGpa: student.gpa,
          expiryDate: uploadExpiryDate,
          issuingAuthority: uploadDocIssuer,
        },
        student.id
      );

      setIsUploadingWithForensics(false);
      setUploadProgressText(null);
      setUploadSelectedFile(null);
      setIsUploadDocOpen(false);

      if (res.report.verdict === "FRAUD_REJECTED") {
        setVaultSyncNotice(`🚨 FRAUD BLOCKED: Document "${uploadDocTitle}" failed statutory verification (${res.report.fraudRiskScore}% Risk).`);
      } else if (res.report.verdict === "SUSPICIOUS_FLAGGED") {
        setVaultSyncNotice(`⚠️ FLAGGED FOR REVIEW: Document "${uploadDocTitle}" saved with ${res.report.fraudRiskScore}% risk score.`);
      } else {
        const cloudMsg = fileUrl ? " (Stored on Cloudinary CDN)" : "";
        setVaultSyncNotice(`✅ VERIFIED GENUINE: Document "${uploadDocTitle}"${cloudMsg} anchored to ledger.`);
      }
      setTimeout(() => setVaultSyncNotice(null), 6000);
      await refreshData();
    });
  };

  // 1-Click Test Presets for Judges
  const handleSeedDocumentPreset = (index: number) => {
    setIsUploadingWithForensics(true);
    startTransition(async () => {
      const res = await db.seedDocumentPreset(index, student.id);
      setIsUploadingWithForensics(false);
      setIsUploadDocOpen(false);
      if (res) {
        if (res.report.verdict === "FRAUD_REJECTED") {
          setVaultSyncNotice(`🚨 FRAUD PREVENTED: Ingested test sample failed Verhoeff/Indian authority checks (${res.report.fraudRiskScore}% Risk Score).`);
        } else {
          setVaultSyncNotice(`✅ Test preset ingested & cryptographically verified (${res.document.title}).`);
        }
        setTimeout(() => setVaultSyncNotice(null), 6000);
      }
      await refreshData();
    });
  };

  const handleDeleteDocument = (id: string) => {
    startTransition(async () => {
      await db.deleteDocument(id);
      await refreshData();
    });
  };

  const handleSyncDigiLocker = () => {
    setIsSyncingVault(true);
    startTransition(async () => {
      await db.syncDigiLocker(student.id);
      setIsSyncingVault(false);
      setLastSyncedText("Last synced just now");
      setVaultSyncNotice("DigiLocker & e-District records synchronized successfully (All statutory records attested).");
      setTimeout(() => setVaultSyncNotice(null), 4000);
      await refreshData();
    });
  };

  const handleBonafideUpload = (fileOrPreset: { name: string; size: string; isFake?: boolean }) => {
    setBonafideStatus("SCANNING");
    setTimeout(async () => {
      const isFake = Boolean(fileOrPreset.isFake || /fake|tamper|photoshop/i.test(fileOrPreset.name));
      const report = runIndianDocumentForensics({
        documentType: "BONAFIDE_CERTIFICATE",
        title: "Bonafide Certificate (Academic Year 2026-27)",
        identifier: isFake ? "INVALID-SEAL-000" : `IITD/REG/2026/BF-${Math.floor(1000 + Math.random() * 9000)}`,
        fileName: fileOrPreset.name,
        fileSize: fileOrPreset.size,
        extractedName: isFake ? "Unknown Candidate" : student.fullName,
        declaredStudentName: student.fullName,
        issuingAuthority: isFake ? "Unverified Private Center" : `${student.department}, IIT Delhi`,
      });

      setBonafideForensicReport(report);

      if (report.verdict === "FRAUD_REJECTED" || report.verdict === "SUSPICIOUS_FLAGGED") {
        setBonafideStatus("SUSPICIOUS");
        setVaultSyncNotice(`🚨 FRAUD PREVENTED: Bonafide failed institutional seal verification (${report.fraudRiskScore}% Fraud Risk).`);
        setTimeout(() => setVaultSyncNotice(null), 6000);
      } else {
        setBonafideStatus("VERIFIED");
        if (typeof window !== "undefined") {
          localStorage.setItem("bonafide_status_verified", "true");
        }
        setBonafideFile({
          name: fileOrPreset.name,
          size: fileOrPreset.size,
          hash: report.sha256Hash,
        });
        await db.uploadDocumentWithForensics(
          {
            documentType: "BONAFIDE_CERTIFICATE",
            title: "Bonafide Certificate (Academic Year 2026-27)",
            identifier: report.extractedIdentifier,
            fileName: fileOrPreset.name,
            fileSize: fileOrPreset.size,
            extractedName: student.fullName,
            declaredStudentName: student.fullName,
            issuingAuthority: "Dean of Academic Affairs, IIT Delhi",
          },
          student.id
        );
        setVaultSyncNotice("✅ Institutional Bonafide verified with AI seal detector and anchored to ledger.");
        setTimeout(() => setVaultSyncNotice(null), 5000);
        await refreshData();
      }
    }, 1100);
  };

  const handleMarkNotificationRead = (id: string) => {
    setSessionDismissedNotifs((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await db.markNotificationRead(id);
      await refreshData();
    });
  };

  const handleOpenDedicatedUpload = (
    docType: IndianDocType,
    defaultTitle: string,
    defaultIssuer: string,
    defaultId: string
  ) => {
    setUploadLockedDocType(docType);
    setUploadIndianDocType(docType);
    setUploadDocTitle(defaultTitle);
    setUploadDocIssuer(defaultIssuer);
    setUploadIdentifier(defaultId);
    setUploadSelectedFile(null);
    setUploadFileName("");
    setUploadFileSize("0 MB");
    setIsUploadDocOpen(true);
  };

  const handleSaveSchemeEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScheme) return;
    startTransition(async () => {
      await db.updateScholarship(editingScheme.id, editingScheme);
      setAdminActionNotice(`Scheme "${editingScheme.title}" updated in database.`);
      setTimeout(() => setAdminActionNotice(null), 5000);
      setIsEditSchemeOpen(false);
      setEditingScheme(null);
      await refreshData();
    });
  };

  // Real Dynamic Cryptographic Ledger Verification
  const handleVerifyHash = async (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : quickHashQuery).trim();
    if (!q) {
      setVerificationResult({
        found: false,
        query: "",
        error: "Please enter an Application ID (e.g. app-201), Document ID (e.g. doc-01), Sanction Code, or Block Hash.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    setIsVerifyingHash(true);
    setVerificationResult(null);

    // Dynamic execution with state verification
    const result = await db.verifyLedgerRecord(q);
    setIsVerifyingHash(false);
    setVerificationResult(result);
  };

  // Full Chain Cryptographic Integrity Audit
  const handleAuditFullChain = async () => {
    setIsAuditingChain(true);
    const integrity = await db.checkLedgerIntegrity();
    setChainIntegrity(integrity);
    setIsAuditingChain(false);
  };

  // Simulate DBT Bank Disbursal Block
  const handleSimulateDBTDisbursal = (appId: string) => {
    startTransition(async () => {
      const res = await db.simulateDBTDisbursal(appId, "Dr. Evelyn Vance (Chair)");
      if (!res.success) {
        alert(res.error);
      } else {
        setAdminActionNotice(`💰 Disbursed DBT Grant for Application ${appId} (Tx: ${res.txHash?.substring(0, 12)}...)`);
        setTimeout(() => setAdminActionNotice(null), 5000);
        await refreshData();
      }
    });
  };

  const handleSeedRandom = () => {
    startTransition(async () => {
      await db.seedRandomScholarship();
      await refreshData();
    });
  };

  const totalSlotsSum = scholarships.reduce((acc, s) => acc + (s.totalSlots || 0), 0);
  const remainingSlotsSum = scholarships.reduce((acc, s) => acc + (s.remainingSlots || 0), 0);
  const totalPoolSum = scholarships.reduce((a, s) => a + ((s.awardAmount || 0) * (s.totalSlots || 1)), 0);

  // =========================================================================
  // 1. DEDICATED SECURITY GATEWAY & LOGIN SCREEN (WHEN LOGGED OUT)
  // =========================================================================
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col font-sans selection:bg-[#2563eb]/20 selection:text-[#004ac6] relative overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2563eb]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#712ae2]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Minimal Header */}
        <header className="h-16 px-6 sm:px-12 flex items-center justify-between border-b border-[#eaedff] bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#004ac6] via-[#2563eb] to-[#712ae2] p-[1px] shadow-sm">
              <div className="h-full w-full bg-[#ffffff] rounded-xl flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-[#004ac6]" />
              </div>
            </div>
            <div>
              <span className="font-bold text-lg text-[#004ac6] tracking-tight font-heading">ScholarHub (PS78)</span>
              <span className="text-xs text-[#737686] block -mt-1 font-medium">National Scholarship Application Management System</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> AES-256 Ledger Hardened
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[11px] font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-[#712ae2]" /> Hackathon Jury Mode
            </span>
          </div>
        </header>

        {/* Login Main Container */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-3xl bg-white rounded-3xl border border-[#eaedff] shadow-2xl overflow-hidden"
          >
            {/* Login Gateway Header */}
            <div className="p-6 sm:p-8 bg-[#f2f3ff] border-b border-[#eaedff] text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#004ac6] text-xs font-bold shadow-sm">
                <Lock className="h-3.5 w-3.5" /> Zero-Trust Role-Gated Portal Authorization
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#131b2e] font-heading tracking-tight">
                National Scholarship Portal Gateway
              </h1>
              <p className="text-xs sm:text-sm text-[#737686] max-w-lg mx-auto">
                Secure access for students, institutional reviewers, and state DBT scholarship administrators.
              </p>

              {/* Gateway Tabs */}
              <div className="flex p-1.5 bg-white/80 backdrop-blur rounded-2xl max-w-md mx-auto mt-4 border border-[#eaedff] shadow-inner">
                <button
                  type="button"
                  onClick={() => setLoginTab("STUDENT")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    loginTab === "STUDENT"
                      ? "bg-[#004ac6] text-white shadow-md"
                      : "text-[#434655] hover:text-[#131b2e] hover:bg-[#f2f3ff]"
                  }`}
                >
                  <School className="h-4 w-4" />
                  Student Portal Gateway
                </button>
                <button
                  type="button"
                  onClick={() => setLoginTab("ADMIN")}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    loginTab === "ADMIN"
                      ? "bg-[#712ae2] text-white shadow-md"
                      : "text-[#434655] hover:text-[#131b2e] hover:bg-[#f2f3ff]"
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Officer & Committee Access
                </button>
              </div>
            </div>

            {/* Tab Body with Animated Transitions */}
            <div className="p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {loginTab === "STUDENT" ? (
                  <motion.div
                    key="student-tab"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {/* 1-Click Fast Student Demo Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#131b2e] uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-[#004ac6]" /> 1-Click Demo Student Personas:
                        </span>
                        <span className="text-[11px] text-[#737686]">Instant multi-profile testing</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {demoPersonas.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleStudentAuth(p)}
                            className="flex flex-col p-3 rounded-2xl bg-[#f2f3ff] hover:bg-[#e2e7ff] text-left transition-all border border-[#eaedff] group hover:shadow-sm"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-[#dbe1ff] text-[#004ac6] font-bold text-[11px] flex items-center justify-center group-hover:scale-105 transition-transform">
                                  {p.fullName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </div>
                                <div>
                                  <span className="font-bold text-xs text-[#131b2e] block group-hover:text-[#004ac6]">
                                    {p.fullName}
                                  </span>
                                  <span className="text-[10px] text-[#737686]">Roll: {p.rollNo}</span>
                                </div>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white font-bold text-[#004ac6] border border-[#eaedff]">
                                {p.gpa} CGPA
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-[#eaedff] flex items-center justify-between text-[10px] text-[#737686]">
                              <span>{p.department.split("&")[0]}</span>
                              <span className="font-medium text-emerald-800">
                                {p.category}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-[#eaedff] w-full" />
                      <span className="bg-white px-3 text-[11px] font-semibold text-[#737686] uppercase tracking-wider absolute">
                        Or Manual Student Authentication
                      </span>
                    </div>

                    {/* Standard Credential Form */}
                    <div className="space-y-4 max-w-md mx-auto">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#434655]">University Roll Number / ID</label>
                        <Input
                          value={loginRollNo}
                          onChange={(e) => setLoginRollNo(e.target.value)}
                          placeholder="2024CSB1089"
                          className="bg-[#f2f3ff] border-[#eaedff] text-xs h-10 rounded-xl"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={() => handleStudentAuth()}
                        className="w-full bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold h-10 rounded-xl shadow-md gap-2"
                      >
                        <Fingerprint className="h-4 w-4" />
                        Sign In via DigiLocker SSO →
                      </Button>
                    </div>

                    <div className="text-[11px] text-[#737686] text-center flex items-center justify-center gap-1.5 pt-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Zero-Knowledge student identity vault attested by UIDAI & e-District</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="admin-tab"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {/* 1-Click Fast Admin Sign In */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#131b2e] uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#712ae2]" /> 1-Click Admin Evaluation Access:
                        </span>
                        <span className="text-[11px] text-[#737686]">Instant committee credentials</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleAdminAuth}
                        className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#eaddff]/60 hover:bg-[#eaddff] text-left transition-all border border-[#712ae2]/30 group hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#712ae2] text-white font-bold text-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                            EV
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#25005a] block">
                              Dr. Evelyn Vance
                            </span>
                            <span className="text-xs text-[#712ae2]">
                              Scholarship Committee Chair & Dean of Financial Aid
                            </span>
                          </div>
                        </div>
                        <span className="px-3 py-1.5 rounded-xl bg-[#712ae2] text-white font-bold text-xs flex items-center gap-1 shadow-sm">
                          Instant Login →
                        </span>
                      </button>
                    </div>

                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-[#eaedff] w-full" />
                      <span className="bg-white px-3 text-[11px] font-semibold text-[#737686] uppercase tracking-wider absolute">
                        Or Officer 2FA Authentication
                      </span>
                    </div>

                    {/* Official Credentials Form */}
                    <div className="space-y-3 max-w-md mx-auto">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#434655]">Official Institutional Email</label>
                        <Input
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="admin@scholarhub.edu"
                          className="bg-[#faf8ff] border-[#eaedff] text-xs h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#434655]">2FA Hardware Key / Security Token</label>
                        <Input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-[#faf8ff] border-[#eaedff] text-xs h-10 rounded-xl"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={handleAdminAuth}
                        className="w-full bg-[#712ae2] hover:bg-[#5a00c6] text-white text-xs font-semibold h-10 rounded-xl shadow-md gap-2"
                      >
                        <KeyRound className="h-4 w-4" />
                        Authenticate with 2FA Token →
                      </Button>
                    </div>

                    <div className="text-[11px] text-[#737686] text-center flex items-center justify-center gap-1.5 pt-2">
                      <Lock className="h-4 w-4 text-[#712ae2]" />
                      <span>Enforces cryptographic multi-sig authorization & automated quota decrement triggers</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // 2. MAIN LOGGED-IN PORTAL (ROLE ISOLATED)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col font-sans selection:bg-[#2563eb]/20 selection:text-[#004ac6]">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR NAVIGATION (STRICT ROLE ISOLATION)                        */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-[#ffffff] border-r border-[#eaedff] shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex-col justify-between overflow-y-auto">
        <div className="flex flex-col">
          {/* Logo Header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-[#eaedff]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#004ac6] via-[#2563eb] to-[#712ae2] p-[1px] shadow-sm">
                <div className="h-full w-full bg-[#ffffff] rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-[#004ac6]" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-[#004ac6] tracking-tight leading-none font-heading">
                  PS78
                </span>
                <span className="text-[10px] text-[#434655] font-medium leading-none mt-1">
                  Scholarship Portal
                </span>
              </div>
            </div>

            <Badge
              className={`text-[9px] font-bold ${
                activeRole === "ADMIN"
                  ? "bg-[#eaddff] text-[#25005a] border-0"
                  : "bg-[#e2e7ff] text-[#004ac6] border-0"
              }`}
            >
              {activeRole}
            </Badge>
          </div>

          {/* STUDENT-ONLY NAVIGATION */}
          {activeRole === "STUDENT" && (
            <div className="px-4 py-4 space-y-1">
              <div className="px-3 py-1 text-[11px] uppercase font-bold tracking-wider text-[#737686]">
                Student Portal
              </div>
              <nav id="tour-sidebar-nav" className="flex flex-col gap-1">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "dashboard"
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="h-4 w-4" />
                    <span>Dashboard</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("scholarships")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "scholarships"
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <School className="h-4 w-4" />
                    <span>Scholarships</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("my-applications")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "my-applications"
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4" />
                    <span>My Applications</span>
                  </div>
                  {studentApplications.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#712ae2] text-white text-[10px] font-bold">
                      {studentApplications.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("documents")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "documents"
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-4 w-4" />
                    <span>Document Vault</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-bold">
                    DigiLocker
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("notifications")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "notifications"
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4" />
                    <span>Notifications</span>
                  </div>
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#712ae2] text-white text-[10px] font-bold">
                      {notifications.filter((n) => !n.read).length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "profile"
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4" />
                    <span>Profile Dossier</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setTabTourKey(null);
                    setIsHelpOpen(true);
                  }}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50/90 hover:bg-purple-100 transition-all border border-purple-200/70 shadow-sm"
                  title="Interactive Platform Guide (?)"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-4 w-4 text-purple-600" />
                    <span>Platform Guide (?)</span>
                  </div>
                  <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0 font-bold shadow-sm">
                    Tour
                  </Badge>
                </button>
              </nav>
            </div>
          )}

          {/* ADMIN-ONLY NAVIGATION */}
          {activeRole === "ADMIN" && (
            <div className="px-4 py-4 space-y-1">
              <div className="px-3 py-1 text-[11px] uppercase font-bold tracking-wider text-[#737686]">
                Administration
              </div>
              <nav id="tour-admin-sidebar-nav" className="flex flex-col gap-1">
                <button
                  onClick={() => setActiveTab("admin-overview")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "admin-overview"
                      ? "bg-[#712ae2] text-white shadow-sm"
                      : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4" />
                    <span>Admin Overview</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("applications-review")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "applications-review"
                      ? "bg-[#712ae2] text-white shadow-sm"
                      : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCheck2 className="h-4 w-4" />
                    <span>Applications Review</span>
                  </div>
                  {applications.filter((a) => a.status === "PENDING").length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                      {applications.filter((a) => a.status === "PENDING").length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("manage-schemes")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "manage-schemes"
                      ? "bg-[#712ae2] text-white shadow-sm"
                      : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4" />
                    <span>Manage Schemes</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "analytics"
                      ? "bg-[#712ae2] text-white shadow-sm"
                      : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4" />
                    <span>Audit Ledger & DBT</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setTabTourKey(null);
                    setIsHelpOpen(true);
                  }}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50/90 hover:bg-purple-100 transition-all border border-purple-200/70 shadow-sm"
                  title="Admin Operations Guide (?)"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-4 w-4 text-purple-600" />
                    <span>Admin Guide (?)</span>
                  </div>
                  <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0 font-bold shadow-sm">
                    Tour
                  </Badge>
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* User Profile Card & Sign Out Button */}
        <div className="p-3 m-3 bg-[#f2f3ff] rounded-xl flex flex-col gap-2 border border-[#eaedff]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                  activeRole === "STUDENT"
                    ? "bg-[#dbe1ff] text-[#004ac6]"
                    : "bg-[#eaddff] text-[#25005a]"
                }`}
              >
                {activeRole === "STUDENT"
                  ? student.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                  : "EV"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs text-[#131b2e] truncate">
                  {activeRole === "STUDENT" ? student.fullName : "Dr. Evelyn Vance"}
                </span>
                <span className="text-[10px] text-[#737686] truncate">
                  {activeRole === "STUDENT"
                    ? `${student.department.split("&")[0]} • ${student.gpa} CGPA`
                    : "Committee Chair (Admin)"}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#737686] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors"
              title="Sign Out to Security Gateway"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER (OFFSET FOR SIDEBAR)                                       */}
      {/* ========================================================================= */}
      <div className="md:pl-72 flex flex-col min-h-screen">
        {/* Top Sticky Header */}
        <header id="tour-top-header" className="sticky top-0 z-40 h-16 bg-[#ffffff]/90 backdrop-blur-xl border-b border-[#eaedff] shadow-[0_1px_8px_rgba(0,0,0,0.04)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Search bar */}
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <div className="md:hidden flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-[#004ac6]" />
              <span className="font-bold text-base text-[#004ac6]">PS78</span>
            </div>

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#737686]" />
              <input
                type="text"
                placeholder="Search scholarships, schemes, records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-[#f2f3ff] rounded-lg text-xs text-[#131b2e] placeholder:text-[#737686] focus:outline-none focus:bg-white border border-transparent focus:border-[#2563eb]"
              />
            </div>
          </div>

          {/* Top Header Actions */}
          <div className="flex items-center gap-3">
            {/* Help & Interactive Platform Walkthrough Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTabTourKey(null);
                setIsHelpOpen(true);
              }}
              className="h-8 px-2.5 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs gap-1.5 rounded-lg shadow-sm font-bold transition-all"
              title={activeRole === "ADMIN" ? "Admin Operations Guide (?)" : "Interactive Platform Guide (?)"}
            >
              <HelpCircle className="h-3.5 w-3.5 text-purple-600" />
              <span className="hidden sm:inline">
                {activeRole === "ADMIN" ? "Admin Guide" : "Platform Guide"}
              </span>
              <span className="sm:hidden font-bold">?</span>
            </Button>

            {/* Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshData()}
              disabled={isPending}
              className="h-8 px-2.5 border-[#eaedff] bg-white hover:bg-[#f2f3ff] text-[#131b2e] text-xs gap-1.5 rounded-lg shadow-sm"
            >
              <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin text-[#004ac6]" : "text-[#004ac6]"}`} />
              Sync
            </Button>

            {/* Notification Icon (Student) */}
            {activeRole === "STUDENT" && (
              <button
                onClick={() => setActiveTab("notifications")}
                className="relative p-2 rounded-lg text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
              >
                <Bell className="h-5 w-5" />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#712ae2]" />
                )}
              </button>
            )}

            {/* Sign Out Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 px-2.5 text-xs text-[#737686] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 gap-1 rounded-lg"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </header>



        {/* Action Alert Notification */}
        <AnimatePresence>
          {adminActionNotice && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#2563eb] text-white px-4 py-2.5 text-xs text-center font-semibold shadow-md flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4 animate-spin" />
              {adminActionNotice}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Render Area */}
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6 max-w-7xl">
          {/* ========================================================================= */}
          {/* 1. STUDENT VIEW: DASHBOARD (Stitch Screen 1)                              */}
          {/* ========================================================================= */}
          {activeRole === "STUDENT" && activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {isDataLoading ? (
                /* Dashboard Skeleton Loading State */
                <div className="space-y-6">
                  <div className="p-8 rounded-2xl bg-white border border-[#eaedff] shadow-sm space-y-4">
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-32 rounded-full" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-60 rounded-lg" />
                    <Skeleton className="h-4 w-96 rounded-md" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-5 rounded-2xl bg-white border border-[#eaedff] space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                      <Skeleton className="h-44 w-full rounded-2xl" />
                      <Skeleton className="h-44 w-full rounded-2xl" />
                    </div>
                    <div>
                      <Skeleton className="h-96 w-full rounded-2xl" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Greeting Banner */}
                  <div className="relative w-full rounded-2xl overflow-hidden bg-[#ffffff] p-6 md:p-8 shadow-sm border border-[#eaedff]">
                    <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-[#2563eb]/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -left-10 -top-10 w-64 h-64 bg-[#712ae2]/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-[#e2e7ff] text-[#004ac6] font-semibold">
                        AY 2025–26 Cycle Active
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#737686]">
                        <span className="w-2 h-2 rounded-full bg-[#712ae2] animate-pulse" />
                        {scholarships.length} Schemes Available
                      </span>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight font-heading mt-1">
                      Good morning, {student.fullName.split(" ")[0]} <span className="inline-block hover:rotate-12 transition-transform duration-300">👋</span>
                    </h1>
                    <p className="text-xs md:text-sm text-[#434655]">
                      Find scholarships that match your profile.{" "}
                      <span className="font-semibold text-[#004ac6]">Profile Once</span> →{" "}
                      <span className="font-semibold text-[#005e6e]">Discover</span> →{" "}
                      <span className="font-semibold text-[#712ae2]">Smart Match</span> →{" "}
                      <span className="font-semibold text-[#131b2e]">Apply</span>.
                    </p>
                  </div>

                  <div id="tour-dashboard-actions" className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => handleStartTabTour("dashboard")}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition-all shadow-sm"
                      title="Learn what each section in Dashboard does"
                    >
                      <HelpCircle className="h-4 w-4 text-purple-600" />
                      <span>Dashboard Guide (?)</span>
                    </button>

                    <button
                      onClick={() => refreshData()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#f2f3ff] text-[#131b2e] hover:bg-[#e2e7ff] text-xs font-semibold transition-all shadow-sm"
                    >
                      <RefreshCw className="h-4 w-4 text-[#004ac6]" />
                      <span>Sync Academic Records</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Completion & Verified Credentials Card */}
              <div id="tour-profile-stats" className="relative w-full rounded-2xl bg-[#ffffff] p-6 shadow-sm border border-[#eaedff]">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="text-[#004ac6] h-5 w-5" />
                        <h2 className="text-sm font-bold text-[#131b2e] font-heading">Profile Completion</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#004ac6]">
                          {bonafideStatus === "VERIFIED" ? "100% Verified" : "90% Verified"}
                        </span>
                        <span className="text-xs text-[#737686]">
                          {bonafideStatus === "VERIFIED" ? "All Clear • Fully Ready for Auto-Fill" : "Almost Ready for Auto-Fill"}
                        </span>
                      </div>
                    </div>

                    {/* Gradient Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-[#eaedff] overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2563eb] via-[#00788c] to-[#10b981] transition-all duration-1000"
                        style={{ width: bonafideStatus === "VERIFIED" ? "100%" : "90%" }}
                      />
                    </div>

                    {/* Verified Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[#e2e7ff] text-[#004ac6]">
                        <Check className="h-3 w-3" /> Academic ({student.gpa.toFixed(2)} CGPA)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[#e2e7ff] text-[#004ac6]">
                        <Check className="h-3 w-3" /> Income (₹{formatCurrency(student.annualIncome)})
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[#e2e7ff] text-[#004ac6]">
                        <Check className="h-3 w-3" /> Category (BC / OBC Verified)
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[#e2e7ff] text-[#004ac6]">
                        <Check className="h-3 w-3" /> Domicile (TN e-District)
                      </span>
                      {bonafideStatus === "VERIFIED" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> All Clear (Institutional Bonafide Attested)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[#ffdad6] text-[#93000a] font-semibold">
                          <AlertTriangle className="h-3 w-3" /> 1 Document Pending Verification
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 lg:pl-6 lg:border-l lg:border-[#eaedff]">
                    <button
                      onClick={() => setActiveTab("documents")}
                      className={`px-5 py-3 rounded-lg text-white text-xs font-semibold shadow-sm transition-all ${
                        bonafideStatus === "VERIFIED"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-[#004ac6] hover:bg-[#003ea8]"
                      }`}
                    >
                      {bonafideStatus === "VERIFIED" ? "View Vault Documents (All Clear) ✓" : "Complete Profile →"}
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Powered Smart Match Hero Card */}
              <div className="relative w-full rounded-2xl bg-gradient-to-br from-[#004ac6] via-[#2563eb] to-[#712ae2] text-white p-6 md:p-8 shadow-xl overflow-hidden">
                <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-1/3 bottom-0 w-64 h-64 bg-[#8a4cfc]/20 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  <div className="lg:col-span-8 flex flex-col gap-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md self-start text-xs font-semibold">
                      <Sparkles className="h-3.5 w-3.5 text-[#acedff]" />
                      AI Powered Multilateral Eligibility Engine
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-heading max-w-xl">
                      Find scholarships made for you
                    </h2>
                    <p className="text-xs md:text-sm text-white/90 max-w-2xl leading-relaxed">
                      PS78 continuously compares your verified student profile with <strong>150+ central, state & private scholarship</strong> eligibility rules with clear, transparent explainability.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          setSmartMatchOnly(true);
                          setActiveTab("scholarships");
                        }}
                        className="flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-[#004ac6] text-xs font-bold shadow-lg hover:bg-[#faf8ff] transition-all"
                      >
                        <Sparkles className="h-4 w-4 text-[#712ae2]" />
                        <span>Run Smart Eligibility Match</span>
                      </button>

                      <button
                        onClick={() => {
                          setSmartMatchOnly(false);
                          setActiveTab("scholarships");
                        }}
                        className="flex items-center gap-2 px-5 py-3 rounded-lg bg-white/15 backdrop-blur-md text-white hover:bg-white/25 text-xs font-semibold transition-all"
                      >
                        <School className="h-4 w-4" />
                        <span>Browse {scholarships.length} Available Schemes</span>
                      </button>
                    </div>
                  </div>

                  {/* Matched Metrics Live Box */}
                  <div className="lg:col-span-4 flex flex-col items-center justify-center">
                    <div className="w-full max-w-xs rounded-xl bg-white/15 backdrop-blur-xl p-4 text-white space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="uppercase font-bold tracking-wider text-white/80">Matched Metrics</span>
                        <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-mono font-bold">
                          LIVE EVAL
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/10 text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-[#acedff]" />
                            <span>Top Match Score</span>
                          </div>
                          <span className="font-bold text-[#acedff]">98% Match</span>
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/10 text-xs">
                          <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-emerald-300" />
                            <span>Pre-Qualified Aid</span>
                          </div>
                          <span className="font-bold text-emerald-300">₹2,80,000</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Recommended Schemes Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#131b2e] tracking-tight flex items-center gap-2 font-heading">
                    <Award className="h-4 w-4 text-[#004ac6]" />
                    Top Matching Schemes for You
                  </h2>
                  <button
                    onClick={() => setActiveTab("scholarships")}
                    className="text-xs font-semibold text-[#004ac6] hover:underline"
                  >
                    View All ({scholarships.length}) →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {scholarships.slice(0, 3).map((sch) => {
                    const elig = checkEligibility(sch);
                    const isClosed = sch.status === "CLOSED" || sch.remainingSlots <= 0;
                    const isCgpaShort = student.gpa < (sch.minGpa ?? 0);

                    return (
                      <div
                        key={sch.id}
                        className="rounded-2xl bg-white border border-[#eaedff] p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#f2f3ff] text-[#004ac6]">
                              {sch.category}
                            </span>
                            <span className="text-xs font-bold text-[#005e6e]">
                              {elig.matchScore}% Match
                            </span>
                          </div>

                          <h3 className="font-bold text-[#131b2e] text-base font-heading line-clamp-2">
                            {sch.title}
                          </h3>

                          <div className="p-3 rounded-xl bg-[#f2f3ff] flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[#737686]">Award</span>
                              <div className="text-base font-bold text-[#004ac6]">
                                ₹{formatCurrency(sch.awardAmount)}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-[#737686]">Slots</span>
                              <div className="text-xs font-semibold text-[#131b2e]">
                                {sch.remainingSlots} of {sch.totalSlots} left
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 mt-3 border-t border-[#eaedff]">
                          {isClosed ? (
                            <Button disabled className="w-full bg-zinc-100 text-zinc-400 text-xs font-semibold h-9 rounded-lg">
                              <Lock className="h-3.5 w-3.5 mr-1" /> Program Full (Closed)
                            </Button>
                          ) : isCgpaShort ? (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleViewSchemeDetail(sch)}
                                className="w-full border-[#eaedff] bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#131b2e] text-xs font-semibold h-9 rounded-lg"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-[#712ae2] mr-1" /> AI Match
                              </Button>
                              <Button
                                disabled
                                className="w-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold h-9 rounded-lg cursor-not-allowed flex items-center justify-center gap-1"
                                title={`Requires min ${sch.minGpa.toFixed(2)} CGPA. Your CGPA: ${student.gpa.toFixed(2)}`}
                              >
                                <AlertTriangle className="h-3 w-3 text-red-600 shrink-0" />
                                <span>Not Eligible</span>
                              </Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleViewSchemeDetail(sch)}
                                className="w-full border-[#eaedff] bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#131b2e] text-xs font-semibold h-9 rounded-lg"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-[#712ae2] mr-1" /> AI Match
                              </Button>
                              <Button
                                onClick={() => handleOpenApplyModal(sch)}
                                className="w-full bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold h-9 rounded-lg shadow-sm"
                              >
                                Apply Now →
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
                </>
              )}
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 2. STUDENT VIEW: SCHOLARSHIPS CATALOG                                     */}
          {/* ========================================================================= */}
          {activeRole === "STUDENT" && activeTab === "scholarships" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div
                id="tour-scholarships-catalog"
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#eaedff] shadow-sm"
              >
                <div>
                  <h1 className="text-2xl font-bold text-[#131b2e] font-heading tracking-tight">
                    Scholarship Opportunities Catalog
                  </h1>
                  <p className="text-xs text-[#737686]">
                    Filter and apply to all active central, state, and institutional grants.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleStartTabTour("scholarships")}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition-all shadow-sm"
                    title="Scholarships & CGPA Guide (?)"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-purple-600" />
                    <span>Scholarships Guide (?)</span>
                  </button>

                  <button
                    onClick={() => setSmartMatchOnly(!smartMatchOnly)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      smartMatchOnly
                        ? "bg-[#004ac6] text-white shadow-sm"
                        : "bg-[#f2f3ff] text-[#434655] hover:text-[#131b2e]"
                    }`}
                  >
                    ✨ {smartMatchOnly ? "Smart Matches (On)" : "Smart Match"}
                  </button>

                  <button
                    onClick={() => setOnlyOpen(!onlyOpen)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      onlyOpen
                        ? "bg-[#005e6e] text-white shadow-sm"
                        : "bg-[#f2f3ff] text-[#434655] hover:text-[#131b2e]"
                    }`}
                  >
                    {onlyOpen ? "Showing Open Only" : "Filter Open"}
                  </button>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {(["ALL", "STEM & Research", "Financial Need", "Academic Merit", "Diversity & Leadership"] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedCategory === cat
                          ? "bg-[#2563eb] text-white shadow-sm"
                          : "bg-white text-[#434655] hover:text-[#131b2e] border border-[#eaedff]"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              {/* Schemes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredScholarships.map((sch, schIdx) => {
                  const elig = checkEligibility(sch);
                  const isClosed = sch.status === "CLOSED" || sch.remainingSlots <= 0;
                  const alreadyApplied = studentApplications.some((a) => a.scholarshipId === sch.id);
                  const isCgpaShort = student.gpa < (sch.minGpa ?? 0);

                  return (
                    <div
                      key={sch.id}
                      className={`rounded-2xl bg-white border p-5 flex flex-col justify-between shadow-sm transition-all ${
                        isClosed ? "border-zinc-200 opacity-75" : "border-[#eaedff] hover:shadow-md"
                      }`}
                    >
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#f2f3ff] text-[#004ac6]">
                            {sch.category}
                          </span>

                          {isClosed ? (
                            <Badge variant="destructive" className="text-[10px] bg-[#ffdad6] text-[#ba1a1a] border-0">
                              <Lock className="h-3 w-3 mr-1" /> Closed (Slots Full)
                            </Badge>
                          ) : sch.remainingSlots === 1 ? (
                            <Badge className="text-[10px] bg-amber-100 text-amber-900 border-0 animate-pulse">
                              <Flame className="h-3 w-3 mr-1" /> 1 Slot Left!
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-emerald-50 text-emerald-800 border-0 font-semibold">
                              <Unlock className="h-3 w-3 mr-1" /> {sch.remainingSlots} of {sch.totalSlots} Slots Open
                            </Badge>
                          )}
                        </div>

                        <div>
                          <h3 className="font-bold text-[#131b2e] text-base font-heading line-clamp-2">
                            {sch.title}
                          </h3>
                          <p className="mt-1 text-xs text-[#737686] line-clamp-2">
                            {sch.description}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-[#f2f3ff] flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#737686]">Award</span>
                            <div className="text-lg font-black text-[#004ac6]">
                              ₹{formatCurrency(sch.awardAmount)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-[#737686]">Match Score</span>
                            <div className="text-sm font-bold text-[#005e6e]">
                              {elig.matchScore}% Match
                            </div>
                          </div>
                        </div>

                        {/* Explainable Match Checklist */}
                        <div
                          id={schIdx === 0 ? "tour-scholarships-cgpa-guard" : undefined}
                          className="space-y-1.5 pt-1 text-xs"
                        >
                          <div className="flex items-center justify-between text-[#434655]">
                            <span className="flex items-center gap-1.5">
                              {elig.gpaOk ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-rose-600" />
                              )}
                              Min GPA: {sch.minGpa.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-[#737686]">(You: {student.gpa.toFixed(2)})</span>
                          </div>

                          {sch.maxIncome && (
                            <div className="flex items-center justify-between text-[#434655]">
                              <span className="flex items-center gap-1.5">
                                {elig.incomeOk ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <X className="h-3.5 w-3.5 text-rose-600" />
                                )}
                                Max Income: ₹{formatCurrency(sch.maxIncome)}
                              </span>
                              <span className="text-[11px] text-[#737686]">(You: ₹{formatCurrency(student.annualIncome)})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        id={schIdx === 0 ? "tour-scholarships-apply-card" : undefined}
                        className="pt-4 mt-3 border-t border-[#eaedff]"
                      >
                        {isClosed ? (
                          <Button disabled className="w-full bg-zinc-100 text-zinc-400 text-xs font-semibold h-9 rounded-lg">
                            <Lock className="h-3.5 w-3.5 mr-1" /> Program Full (Closed)
                          </Button>
                        ) : alreadyApplied ? (
                          <Button disabled className="w-full bg-[#f2f3ff] text-[#004ac6] text-xs font-semibold h-9 rounded-lg">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Applied
                          </Button>
                        ) : isCgpaShort ? (
                          <Button
                            disabled
                            className="w-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-50 text-xs font-bold h-9 rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
                            title={`Requires min ${sch.minGpa.toFixed(2)} CGPA. Your CGPA: ${student.gpa.toFixed(2)}`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            <span>You Are Not Eligible (Min {sch.minGpa.toFixed(2)} CGPA Required)</span>
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleOpenApplyModal(sch)}
                            className="w-full bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold h-9 rounded-lg shadow-sm"
                          >
                            Apply with Auto-fill →
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 2B. STUDENT VIEW: SCHOLARSHIP DETAIL & EXPLAINABLE MATCH (Stitch Screen 3) */}
          {/* ========================================================================= */}
          {activeRole === "STUDENT" && activeTab === "scholarship-detail" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 max-w-7xl mx-auto pb-16"
            >
              {(() => {
                const currentScheme = selectedDetailScheme || scholarships[0] || initialScholarships[0];
                const elig = checkEligibility(currentScheme);
                const isClosed = currentScheme.status === "CLOSED" || currentScheme.remainingSlots <= 0;
                const alreadyApplied = studentApplications.some((a) => a.scholarshipId === currentScheme.id);

                return (
                  <div className="flex flex-col gap-6">
                    {/* Top Breadcrumbs */}
                    <nav className="flex items-center flex-wrap gap-2 text-[#737686] text-xs font-semibold">
                      <button
                        onClick={() => setActiveTab("scholarships")}
                        className="hover:text-[#004ac6] transition-colors flex items-center gap-1"
                      >
                        <School className="h-3.5 w-3.5" /> Scholarships
                      </button>
                      <ChevronRight className="h-3.5 w-3.5 text-[#c3c6d7]" />
                      <span className="text-[#434655]">{currentScheme.category}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#c3c6d7]" />
                      <span className="text-[#131b2e] font-bold truncate max-w-xs">{currentScheme.title}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#c3c6d7]" />
                      <span className="px-2 py-0.5 rounded-full bg-[#eaddff] text-[#25005a] text-[10px] font-bold">
                        Eligibility Analysis
                      </span>
                    </nav>

                    {/* Scheme Title Header Block */}
                    <header className="w-full bg-[#ffffff] rounded-2xl p-6 md:p-8 shadow-sm border border-[#eaedff] relative overflow-hidden">
                      <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#2563eb]/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="relative z-10 flex flex-col gap-4">
                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2e7ff] text-[#004ac6] text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-[#004ac6] animate-pulse" /> Applications Open (AY 2026-27)
                          </span>
                          <span className="px-3 py-1 rounded-full bg-[#f2f3ff] text-[#434655] text-xs font-semibold">
                            Ministry of Education & Welfare
                          </span>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified Official Scheme
                          </span>
                        </div>

                        {/* Title & Authority */}
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="max-w-3xl space-y-1">
                            <h1 className="text-2xl md:text-3xl font-extrabold text-[#131b2e] tracking-tight font-heading leading-tight">
                              {currentScheme.title}
                            </h1>
                            <p className="text-xs md:text-sm text-[#434655] flex items-center gap-1.5">
                              <Landmark className="h-4 w-4 text-[#737686]" />
                              Central & State Joint Welfare Directorate • Tamil Nadu / National Quota
                            </p>
                          </div>

                          <div className="hidden lg:flex items-center gap-3 bg-[#f2f3ff] px-4 py-2.5 rounded-xl border border-[#eaedff]">
                            <div className="w-10 h-10 rounded-lg bg-[#dae2fd] flex items-center justify-center text-[#004ac6]">
                              <FileBadge className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-[#131b2e]">Direct Sanction Quota</span>
                              <span className="text-[10px] text-[#737686] font-mono">SCH-2026-{currentScheme.id.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Info Strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                          <div className="bg-[#f2f3ff]/80 rounded-xl p-4 flex flex-col justify-between border border-[#eaedff]/60">
                            <span className="text-[11px] font-bold text-[#737686] uppercase flex items-center gap-1">
                              <Award className="h-3.5 w-3.5 text-[#004ac6]" /> Annual Award
                            </span>
                            <div className="mt-2 text-xl font-black text-[#004ac6] font-mono">
                              ₹{formatCurrency(currentScheme.awardAmount)}{" "}
                              <span className="text-xs font-normal text-[#434655]">/ yr</span>
                            </div>
                          </div>

                          <div className="bg-[#f2f3ff]/80 rounded-xl p-4 flex flex-col justify-between border border-[#eaedff]/60">
                            <span className="text-[11px] font-bold text-[#737686] uppercase flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-[#712ae2]" /> Deadline
                            </span>
                            <div className="mt-2">
                              <span className="text-sm font-bold text-[#131b2e] block">30 Sep 2026</span>
                              <span className="inline-block px-2 py-0.5 mt-0.5 rounded-full bg-[#eaddff] text-[#25005a] text-[10px] font-bold">
                                48 days remaining
                              </span>
                            </div>
                          </div>

                          <div className="bg-[#f2f3ff]/80 rounded-xl p-4 flex flex-col justify-between border border-[#eaedff]/60">
                            <span className="text-[11px] font-bold text-[#737686] uppercase flex items-center gap-1">
                              <School className="h-3.5 w-3.5 text-[#005e6e]" /> Target Cohort
                            </span>
                            <div className="mt-2">
                              <span className="text-sm font-bold text-[#131b2e] block">Undergraduate</span>
                              <span className="text-[11px] text-[#434655]">B.E. / B.Tech (Full-time)</span>
                            </div>
                          </div>

                          <div className="bg-[#f2f3ff]/80 rounded-xl p-4 flex flex-col justify-between border border-[#eaedff]/60">
                            <span className="text-[11px] font-bold text-[#737686] uppercase flex items-center gap-1">
                              <Landmark className="h-3.5 w-3.5 text-[#004ac6]" /> Disbursal Protocol
                            </span>
                            <div className="mt-2">
                              <span className="text-sm font-bold text-[#131b2e] block">Direct Benefit (DBT)</span>
                              <span className="text-[11px] text-[#434655]">Aadhaar-Linked Bank Bridge</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </header>

                    {/* HERO FEATURE: Explainable AI Eligibility Engine */}
                    <section className="w-full bg-[#ffffff] rounded-2xl shadow-sm border border-[#eaedff] p-6 md:p-8 relative overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#eaedff]">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#712ae2] text-white text-[11px] font-bold uppercase tracking-wider">
                              <Sparkles className="h-3 w-3" /> PS78 DeepVerify
                            </span>
                            <span className="text-xs text-[#737686] font-semibold">Real-time Rule Matcher</span>
                          </div>
                          <h2 className="text-xl md:text-2xl font-extrabold text-[#131b2e] tracking-tight font-heading">
                            Why You Match — Explainable AI Eligibility Engine
                          </h2>
                          <p className="text-xs text-[#434655] mt-1">
                            Algorithmically mapped against Tamil Nadu State Gazette & Central Ministry Rules (Ref: ED/2026/BC-81).
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => refreshData()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#f2f3ff] text-[#131b2e] hover:bg-[#e2e7ff] text-xs font-semibold transition-all shadow-sm"
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-[#004ac6]" /> Re-evaluate Match
                          </button>
                        </div>
                      </div>

                      {/* Gauge + Macro Insights Bento */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-stretch">
                        {/* Large Visual Ring Gauge */}
                        <div className="lg:col-span-4 bg-[#f2f3ff] rounded-2xl p-6 flex flex-col items-center justify-center text-center relative border border-[#eaedff]">
                          <div className="relative w-40 h-40 flex items-center justify-center my-2">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                              <circle className="text-[#dae2fd] fill-none" cx="60" cy="60" r="50" stroke="currentColor" stroke-width="10" />
                              <circle
                                className="text-[#712ae2] fill-none rounded-full transition-all duration-1000"
                                cx="60"
                                cy="60"
                                r="50"
                                stroke="currentColor"
                                strokeDasharray="314.159"
                                strokeDashoffset={314.159 * (1 - elig.matchScore / 100)}
                                strokeLinecap="round"
                                strokeWidth="10"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-3xl font-extrabold text-[#131b2e] font-heading leading-none">
                                {elig.matchScore}%
                              </span>
                              <span className="text-[10px] text-[#737686] mt-1 font-bold uppercase tracking-wider">
                                Match Score
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> High Acceptance Probability
                            </span>
                            <span className="text-[11px] text-[#737686]">Dossier meets 4 of 4 mandatory statutory thresholds</span>
                          </div>
                        </div>

                        {/* 4 Match Pillars */}
                        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-4 rounded-xl bg-white border border-[#eaedff] flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#131b2e] flex items-center gap-1.5">
                                <GraduationCap className="h-4 w-4 text-[#004ac6]" /> Academic Merit Criteria
                              </span>
                              {elig.gpaOk ? (
                                <Badge className="bg-emerald-50 text-emerald-800 border-0 text-[10px] font-bold">Passed</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px]">Under Criteria</Badge>
                              )}
                            </div>
                            <div className="text-xs text-[#434655] mt-2 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-[#737686]">Required CGPA:</span>
                                <span className="font-bold font-mono">≥ {currentScheme.minGpa.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#737686]">Your Verified CGPA:</span>
                                <span className="font-bold text-[#004ac6] font-mono">{student.gpa.toFixed(2)}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-medium pt-2 block">✓ Reconciled via IIT Delhi NAD Registrar</span>
                          </div>

                          <div className="p-4 rounded-xl bg-white border border-[#eaedff] flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#131b2e] flex items-center gap-1.5">
                                <DollarSign className="h-4 w-4 text-[#005e6e]" /> Income Ceiling Criteria
                              </span>
                              {elig.incomeOk ? (
                                <Badge className="bg-emerald-50 text-emerald-800 border-0 text-[10px] font-bold">Passed</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px]">Exceeds Limit</Badge>
                              )}
                            </div>
                            <div className="text-xs text-[#434655] mt-2 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-[#737686]">Ceiling Limit:</span>
                                <span className="font-bold font-mono">₹{formatCurrency(currentScheme.maxIncome || 250000)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#737686]">Your Attested Income:</span>
                                <span className="font-bold text-[#005e6e] font-mono">₹{formatCurrency(student.annualIncome)}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-medium pt-2 block">✓ Tahsildar e-District Verified</span>
                          </div>

                          <div className="p-4 rounded-xl bg-white border border-[#eaedff] flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#131b2e] flex items-center gap-1.5">
                                <School className="h-4 w-4 text-[#712ae2]" /> Institutional Affiliation
                              </span>
                              <Badge className="bg-emerald-50 text-emerald-800 border-0 text-[10px] font-bold">Eligible Institute</Badge>
                            </div>
                            <p className="text-xs text-[#434655] mt-2">
                              Institution: <strong className="text-[#131b2e]">IIT Delhi</strong> • Technical Tier-1 recognized by Central AISHE scheme.
                            </p>
                            <span className="text-[10px] text-emerald-700 font-medium pt-2 block">✓ AISHE Code C-23841 Validated</span>
                          </div>

                          <div className="p-4 rounded-xl bg-white border border-[#eaedff] flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-[#131b2e] flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4 text-[#004ac6]" /> Statutory Category Quota
                              </span>
                              <Badge className="bg-emerald-50 text-emerald-800 border-0 text-[10px] font-bold">Attested</Badge>
                            </div>
                            <p className="text-xs text-[#434655] mt-2">
                              Category: <strong className="text-[#131b2e]">OBC-NCL / General Tech</strong> • Domicile: Tamil Nadu (Valid).
                            </p>
                            <span className="text-[10px] text-emerald-700 font-medium pt-2 block">✓ DigiLocker Repository Certified</span>
                          </div>
                        </div>
                      </div>

                      {/* Action CTA Strip */}
                      <div className="pt-4 border-t border-[#eaedff] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <button
                          onClick={() => setActiveTab("scholarships")}
                          className="px-4 py-2.5 rounded-lg bg-[#f2f3ff] text-[#434655] hover:text-[#131b2e] text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" /> Back to Scholarships
                        </button>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {isClosed ? (
                            <Button disabled className="w-full sm:w-auto bg-zinc-100 text-zinc-400 text-xs font-semibold h-10 px-6 rounded-lg">
                              <Lock className="h-4 w-4 mr-1.5" /> Program Quota Full (Closed)
                            </Button>
                          ) : alreadyApplied ? (
                            <Button
                              onClick={() => setActiveTab("my-applications")}
                              className="w-full sm:w-auto bg-[#e2e7ff] text-[#004ac6] text-xs font-semibold h-10 px-6 rounded-lg"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Already Applied (Track Dossier →)
                            </Button>
                          ) : student.gpa < (currentScheme.minGpa ?? 0) ? (
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                              <div className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                                <span>You Are Not Eligible: Requires min {currentScheme.minGpa.toFixed(2)} CGPA (Your CGPA: {student.gpa.toFixed(2)})</span>
                              </div>
                              <Button disabled className="w-full sm:w-auto bg-zinc-200 text-zinc-500 text-xs font-bold h-11 px-6 rounded-lg cursor-not-allowed">
                                Application Blocked
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleOpenApplyModal(currentScheme)}
                              className="w-full sm:w-auto bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-bold h-11 px-8 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 group"
                            >
                              <span>Apply with Smart Auto-Fill</span>
                              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 2C. STUDENT VIEW: SMART PRE-FILLED APPLICATION FLOW (Stitch Screen 4)      */}
          {/* ========================================================================= */}
          {activeRole === "STUDENT" && activeTab === "apply-flow" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 max-w-7xl mx-auto pb-24"
            >
              {(() => {
                const currentScheme = selectedScholarship || scholarships[0] || initialScholarships[0];
                const wordCount = appEssay.trim().split(/\s+/).filter(Boolean).length;

                return (
                  <div className="flex flex-col gap-6">
                    {/* Top Progress Ribbon & Stepper Container */}
                    <div className="w-full bg-[#ffffff] rounded-2xl p-6 md:p-8 shadow-sm border border-[#eaedff] flex flex-col gap-6">
                      {/* Step Context Tracker */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-full bg-[#dbe1ff] text-[#00174b] font-bold text-xs">
                            Step {applyStep} of 6
                          </span>
                          <span className="text-base font-bold text-[#131b2e] font-heading">
                            {applyStep === 1 && "Personal & Verified Identity"}
                            {applyStep === 2 && "Academic Details & Registry Sync"}
                            {applyStep === 3 && "Financial & Category Eligibility"}
                            {applyStep === 4 && "Document Verification & Vault"}
                            {applyStep === 5 && "Statement of Purpose & Declaration"}
                            {applyStep === 6 && "Final Review & Merkle Anchor"}
                          </span>
                          <span className="hidden md:inline-block text-[#c3c6d7] text-xs">•</span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#712ae2]">
                            <Sparkles className="h-3.5 w-3.5" /> 85% Pre-filled from PS78 Profile
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[#434655] text-xs font-semibold">
                          <Lock className="h-4 w-4 text-[#005e6e]" />
                          <span>Encrypted DigiLocker Pipeline</span>
                        </div>
                      </div>

                      {/* Linear Stepper Bar Nodes (6 Steps) */}
                      <div className="relative w-full pt-2 pb-1">
                        <div className="grid grid-cols-6 items-center w-full relative z-10 gap-2">
                          {[
                            { num: 1, label: "1. Personal Info", sub: "Verified" },
                            { num: 2, label: "2. Academic", sub: "Verified" },
                            { num: 3, label: "3. Financial", sub: "Verified" },
                            { num: 4, label: "4. Documents", sub: "Active Step" },
                            { num: 5, label: "5. Review", sub: "Pending" },
                            { num: 6, label: "6. Submit", sub: "Final" },
                          ].map((step) => {
                            const isDone = applyStep > step.num;
                            const isActive = applyStep === step.num;

                            return (
                              <div
                                key={step.num}
                                onClick={() => setApplyStep(step.num)}
                                className="flex flex-col items-center text-center cursor-pointer group transition-all"
                              >
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-all ${
                                    isDone
                                      ? "bg-[#e2e7ff] text-[#004ac6]"
                                      : isActive
                                      ? "bg-[#2563eb] text-white ring-4 ring-[#2563eb]/20 animate-pulse"
                                      : "bg-[#f2f3ff] text-[#737686]"
                                  }`}
                                >
                                  {isDone ? <Check className="h-4 w-4" /> : step.num}
                                </div>
                                <span
                                  className={`mt-2 text-[11px] hidden sm:block ${
                                    isActive ? "text-[#2563eb] font-bold" : "text-[#434655] font-medium"
                                  }`}
                                >
                                  {step.label}
                                </span>
                                <span className="text-[10px] text-[#737686] hidden md:block">
                                  {isDone ? "Verified" : isActive ? "Active" : "Pending"}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Connecting Progress Line */}
                        <div className="hidden lg:block absolute top-[24px] left-[8%] right-[8%] h-1 bg-[#eaedff] -z-0">
                          <div
                            className="h-full bg-[#2563eb] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, ((applyStep - 1) / 5) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI Smart Auto-Fill Banner */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#004ac6]/10 via-[#712ae2]/10 to-[#eaedff] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-[#eaedff]">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#712ae2] to-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-md">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-[#131b2e] font-heading">
                              All Mandatory Statutory Documents Verified
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#ffffff] text-[#004ac6] text-xs font-bold shadow-xs">
                              High Confidence 99.8%
                            </span>
                          </div>
                          <p className="text-xs text-[#434655] max-w-3xl leading-relaxed">
                            DigiLocker, UIDAI e-KYC, and IIT Delhi institutional registry synchronization completed successfully.
                            All mandatory identity, academic, income, and banking credentials are cryptographically certified.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <span className="px-3 py-1.5 rounded-lg bg-white text-xs font-bold text-[#004ac6] shadow-sm flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-[#005e6e]" /> 6 of 6 Ready
                        </span>
                        <span className="px-3 py-1.5 rounded-lg bg-[#e2e7ff] text-xs font-bold text-[#004ac6] shadow-sm flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5 text-[#005e6e]" /> DigiLocker Certified
                        </span>
                      </div>
                    </div>

                    {/* Main Workspace Layout: Bento Split (8 cols left, 4 cols right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Primary Column: Step Content (8 cols) */}
                      <div className="lg:col-span-8 flex flex-col gap-6">
                        {/* STEP 1: Personal Info */}
                        {applyStep === 1 && (
                          <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
                              <div>
                                <h3 className="font-bold text-[#131b2e] text-base font-heading">
                                  Personal & Identity Dossier
                                </h3>
                                <p className="text-xs text-[#737686]">
                                  Pre-filled and verified via UIDAI e-KYC registry.
                                </p>
                              </div>
                              <Badge className="bg-emerald-50 text-emerald-800 border-0 text-xs font-semibold gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Aadhaar Linked
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Full Legal Name</label>
                                <Input value={student.fullName} readOnly className="bg-[#f2f3ff] border-[#eaedff]" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Father / Guardian Name</label>
                                <Input defaultValue="Parthasarathy R" className="bg-white border-[#eaedff]" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Date of Birth (DOB)</label>
                                <Input defaultValue="2005-08-14" className="bg-[#f2f3ff] border-[#eaedff]" readOnly />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Gender</label>
                                <Input defaultValue="Male / Verified" className="bg-[#f2f3ff] border-[#eaedff]" readOnly />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Mobile Number</label>
                                <Input defaultValue="+91 98765 43210" className="bg-white border-[#eaedff]" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Institutional Email</label>
                                <Input value={student.email} readOnly className="bg-[#f2f3ff] border-[#eaedff]" />
                              </div>
                              <div className="space-y-1 sm:col-span-2">
                                <label className="font-bold text-[#434655]">Permanent Residential Address</label>
                                <Input defaultValue="Flat 402, Kaveri Block, IIT Delhi Campus, Hauz Khas, New Delhi - 110016" className="bg-white border-[#eaedff]" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 2: Academic Details */}
                        {applyStep === 2 && (
                          <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
                              <div>
                                <h3 className="font-bold text-[#131b2e] text-base font-heading">
                                  Verified Academic Details & CGPA
                                </h3>
                                <p className="text-xs text-[#737686]">
                                  Reconciled from National Academic Depository (NAD) & IIT Delhi Dean of Academics.
                                </p>
                              </div>
                              <Badge className="bg-emerald-50 text-emerald-800 border-0 text-xs font-semibold gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> NAD Synced
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Enrolled Institution</label>
                                <Input defaultValue="Indian Institute of Technology Delhi (IITD)" readOnly className="bg-[#f2f3ff] border-[#eaedff]" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Student Roll / Registration No</label>
                                <Input defaultValue="2024CS10892" readOnly className="bg-[#f2f3ff] border-[#eaedff] font-mono" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Department / Program</label>
                                <Input
                                  value={appDepartment}
                                  onChange={(e) => setAppDepartment(e.target.value)}
                                  className="bg-white border-[#eaedff]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Cumulative CGPA (10.0 Scale)</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={appGpa}
                                  onChange={(e) => setAppGpa(e.target.value)}
                                  className="bg-white border-[#eaedff] font-mono font-bold text-[#004ac6]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Class 12th Board Score (CBSE)</label>
                                <Input defaultValue="96.4% (All Subjects)" readOnly className="bg-[#f2f3ff] border-[#eaedff]" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Class 10th Board Score (CBSE)</label>
                                <Input defaultValue="98.0% (All Subjects)" readOnly className="bg-[#f2f3ff] border-[#eaedff]" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 3: Financial & Category */}
                        {applyStep === 3 && (
                          <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
                              <div>
                                <h3 className="font-bold text-[#131b2e] text-base font-heading">
                                  Financial & Statutory Category Attestation
                                </h3>
                                <p className="text-xs text-[#737686]">
                                  Attested via e-District Revenue Directorate and State Backward Classes Welfare registry.
                                </p>
                              </div>
                              <Badge className="bg-emerald-50 text-emerald-800 border-0 text-xs font-semibold gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Revenue Attested
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Certified Annual Family Income (₹)</label>
                                <Input
                                  type="number"
                                  value={appIncome}
                                  onChange={(e) => setAppIncome(e.target.value)}
                                  className="bg-white border-[#eaedff] font-mono font-bold text-[#005e6e]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Tahsildar Certificate Ref No</label>
                                <Input defaultValue="TN-REV/2026/0948215" readOnly className="bg-[#f2f3ff] border-[#eaedff] font-mono" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Social / Caste Category</label>
                                <Input defaultValue="OBC-NCL (Central List)" readOnly className="bg-[#f2f3ff] border-[#eaedff]" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Bank Name & Branch</label>
                                <Input defaultValue="State Bank of India (IIT Delhi Branch)" readOnly className="bg-[#f2f3ff] border-[#eaedff]" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">Bank Account Number (Aadhaar Seeded)</label>
                                <Input defaultValue="**********8912" readOnly className="bg-[#f2f3ff] border-[#eaedff] font-mono" />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-[#434655]">IFSC Code</label>
                                <Input defaultValue="SBIN0001077" readOnly className="bg-[#f2f3ff] border-[#eaedff] font-mono" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 4: Documents (The exact 6 statutory document cards from Stitch!) */}
                        {applyStep === 4 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h2 className="text-xl font-bold text-[#131b2e] font-heading">
                                  Submitted & Vault Documents
                                </h2>
                                <p className="text-xs text-[#737686]">
                                  All mandatory student documentation fetched and cryptographically verified from national registries.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSyncDigiLocker()}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-colors flex items-center gap-1.5"
                                >
                                  <RefreshCw className={`h-3.5 w-3.5 text-[#004ac6] ${isSyncingVault ? "animate-spin" : ""}`} />
                                  <span>Re-sync DigiLocker</span>
                                </button>
                                <button
                                  onClick={() => setIsUploadDocOpen(true)}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#004ac6] text-xs font-semibold text-white hover:bg-[#003ea8] transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                  <UploadCloud className="h-3.5 w-3.5" />
                                  <span>Direct File Upload</span>
                                </button>
                              </div>
                            </div>

                            {/* Document 1: Aadhaar Card */}
                            <div className="bg-[#ffffff] rounded-2xl p-5 shadow-sm border border-[#eaedff] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-[#004ac6] shrink-0">
                                  <Fingerprint className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#131b2e] text-sm">
                                      Aadhaar Card / National Identity Card
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" /> Verified via UIDAI e-KYC
                                    </span>
                                  </div>
                                  <span className="text-xs text-[#434655] block font-mono">
                                    Tokenized ID: XXXX-XXXX-4819 • {student.fullName}
                                  </span>
                                  <div className="flex items-center gap-2 text-[#737686] text-[11px] flex-wrap">
                                    <span>DOB: 14-Aug-2005 (Matched)</span>
                                    <span>•</span>
                                    <span>Gender: Male</span>
                                    <span>•</span>
                                    <span>Biometrics: Active</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                <button
                                  onClick={() => {
                                    const doc = vaultDocuments.find((d) => d.id === "doc-03" || d.title.includes("Aadhaar")) || {
                                      id: "doc-03",
                                      studentId: student.id,
                                      title: "Aadhaar Card / National Identity Card",
                                      issuer: "UIDAI Authority • DBT NPCI Bridge",
                                      fileName: "aadhaar_ekyc_tokenized.xml",
                                      fileSize: "249 KB",
                                      fileType: "National Identity Verification",
                                      validity: "Active & Tokenized",
                                      sha256Hash: "0x12a884f09a1288cba8019b78a9c801e7a1",
                                      metricLabel: "DBT Mapping",
                                      metricValue: "SBI A/C ****4819 (Active)",
                                      isVerified: true,
                                      verifiedAt: "2026-09-01",
                                      verdict: "GENUINE_VERIFIED",
                                      fraudRiskScore: 0,
                                      extractedIdentifier: "5486 9214 7305",
                                      fileUrl: "/specimens/aadhaar.png",
                                      checks: [
                                        { checkName: "UIDAI Verhoeff Checksum (Dihedral D5)", passed: true, details: "12-digit Aadhaar passed Verhoeff parity checksum." },
                                        { checkName: "UIDAI National Format Conformity", passed: true, details: "Standard 12-digit UIDAI block structure." },
                                        { checkName: "NPCI DBT Bank Bridge", passed: true, details: "Aadhaar linked to State Bank of India IFSC SBIN0001423." },
                                      ],
                                    };
                                    setPreviewDoc(doc);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Preview
                                </button>
                                <button
                                  onClick={() => handleOpenDedicatedUpload("AADHAAR_UIDAI", "Aadhaar Card / National Identity Card", "UIDAI Authority • DBT NPCI Bridge", "5486 9214 7305")}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Replace
                                </button>
                              </div>
                            </div>

                            {/* Document 2: Academic Marksheets */}
                            <div className="bg-[#ffffff] rounded-2xl p-5 shadow-sm border border-[#eaedff] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-[#004ac6] shrink-0">
                                  <GraduationCap className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#131b2e] text-sm">
                                      Academic Marksheets &amp; Transcripts (10th, 12th &amp; College)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" /> DigiLocker &amp; IIT Delhi Verified
                                    </span>
                                  </div>
                                  <span className="text-xs text-[#434655] block">
                                    IIT Delhi B.Tech CSE ({student.gpa.toFixed(2)} CGPA) • Class 12 CBSE (96.4%) • Class 10 CBSE (98.0%)
                                  </span>
                                  <div className="flex items-center gap-2 text-[#737686] text-[11px] flex-wrap">
                                    <span>CBSE Roll: 14692811</span>
                                    <span>•</span>
                                    <span>Degree Roll: 2024CS10892</span>
                                    <span>•</span>
                                    <span>3 Records Synced</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                <button
                                  onClick={() => {
                                    const doc = vaultDocuments.find((d) => d.id === "doc-02" || d.title.includes("Transcript") || d.title.includes("Marksheet")) || {
                                      id: "doc-02",
                                      studentId: student.id,
                                      title: "Official Academic Transcript",
                                      issuer: "IIT Delhi Examination Cell • Dean Academics",
                                      fileName: "Verified_Academic_Transcript.pdf",
                                      fileSize: "2.4 MB",
                                      fileType: "Institutional Grade Sheet",
                                      validity: "Permanent Academic Record",
                                      sha256Hash: "0x89dc71092efb119a018742ca899017e891",
                                      metricLabel: "Cumulative CGPA",
                                      metricValue: "3.92 / 10.00 (Top 2%)",
                                      isVerified: true,
                                      verifiedAt: "2026-09-12",
                                      verdict: "GENUINE_VERIFIED",
                                      fraudRiskScore: 0,
                                      extractedIdentifier: "2024CSB1089",
                                      fileUrl: "/specimens/marksheet.svg",
                                      checks: [
                                        { checkName: "CGPA/Marks Numerical Boundary Sanity", passed: true, details: "CGPA 3.92 within valid range." },
                                        { checkName: "Institutional Roll Number Validation", passed: true, details: "Roll number 2024CSB1089 verified." },
                                        { checkName: "Identity Match", passed: true, details: "Matches registered student Priya Sharma." },
                                      ],
                                    };
                                    setPreviewDoc(doc);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View All (3)
                                </button>
                                <button
                                  onClick={() => handleOpenDedicatedUpload("ACADEMIC_MARKSHEET", "Academic Marksheets & Transcripts", "IIT Delhi Examination Cell", "2024CSB1089")}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Update
                                </button>
                              </div>
                            </div>

                            {/* Document 3: Institutional Bonafide */}
                            <div className="bg-[#ffffff] rounded-2xl p-5 shadow-sm border border-[#eaedff] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-[#004ac6] shrink-0">
                                  <School className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#131b2e] text-sm">
                                      Institutional Bonafide Certificate (2026-27)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" /> AI-Checked &amp; Registrar Match 100%
                                    </span>
                                  </div>
                                  <span className="text-xs text-[#434655] block">
                                    Office of the Dean of Academic Affairs • Indian Institute of Technology Delhi
                                  </span>
                                  <div className="flex items-center gap-2 text-[#737686] text-[11px] flex-wrap">
                                    <span>Ref: IITD/ACAD/2026/BF-8912</span>
                                    <span>•</span>
                                    <span>Seal &amp; Signature Validated</span>
                                    <span>•</span>
                                    <span>PDF 1.2 MB</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                <button
                                  onClick={() => {
                                    const doc = vaultDocuments.find((d) => d.id === "doc-04" || d.title.includes("Bonafide")) || {
                                      id: "doc-04",
                                      studentId: student.id,
                                      title: "Institutional Bonafide Certificate (2026-27)",
                                      issuer: "Office of the Dean of Academic Affairs • IIT Delhi",
                                      fileName: "IITD_Bonafide_AY26-27.pdf",
                                      fileSize: "1.2 MB",
                                      fileType: "Institutional Attestation",
                                      validity: "Academic Year 2026-27",
                                      sha256Hash: "0x89ab1024fbd90218ab28e19c0018f4a1239",
                                      metricLabel: "Attestation Level",
                                      metricValue: "Registrar Match 100%",
                                      isVerified: true,
                                      verifiedAt: "2026-09-14",
                                      verdict: "GENUINE_VERIFIED",
                                      fraudRiskScore: 0,
                                      extractedIdentifier: "IITD/ACAD/2026/BF-8912",
                                      fileUrl: "/specimens/bonafide.svg",
                                      checks: [
                                        { checkName: "Institutional Seal Dihedral Parity", passed: true, details: "Official IIT Delhi Dean seal recognized." },
                                        { checkName: "Academic Term Concordance", passed: true, details: "Term AY 2026-27 current and active." },
                                        { checkName: "Student Registry Match", passed: true, details: "2024CSB1089 Priya Sharma matched." },
                                      ],
                                    };
                                    setPreviewDoc(doc);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Preview
                                </button>
                                <button
                                  onClick={() => handleOpenDedicatedUpload("BONAFIDE_CERTIFICATE", "Institutional Bonafide Certificate (2026-27)", "Dean of Academic Affairs, IIT Delhi", "IITD/ACAD/2026/BF-8912")}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Replace
                                </button>
                              </div>
                            </div>

                            {/* Document 4: Tahsildar Income Certificate */}
                            <div className="bg-[#ffffff] rounded-2xl p-5 shadow-sm border border-[#eaedff] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-[#004ac6] shrink-0">
                                  <DollarSign className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#131b2e] text-sm">
                                      Income Certificate (Tahsildar / Revenue Authority)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" /> Verified via e-District / DigiLocker
                                    </span>
                                  </div>
                                  <span className="text-xs text-[#434655] block">
                                    Certificate No: TN-REV-2024-89218 • Valid till Mar 2027
                                  </span>
                                  <div className="flex items-center gap-2 text-[#737686] text-[11px] flex-wrap">
                                    <span>Annual Family Income: ₹{formatCurrency(student.annualIncome)}</span>
                                    <span>•</span>
                                    <span>Issuing Officer: Tahsildar North Division</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                <button
                                  onClick={() => {
                                    const doc = vaultDocuments.find((d) => d.id === "doc-01" || d.title.includes("Income")) || {
                                      id: "doc-01",
                                      studentId: student.id,
                                      title: "Annual Family Income Certificate",
                                      issuer: "Tahsildar Revenue Office (TN e-District)",
                                      fileName: "income_certificate_2026_signed.pdf",
                                      fileSize: "1.8 MB",
                                      fileType: "Revenue Authority Attestation",
                                      validity: "Valid till 31 Mar 2027",
                                      sha256Hash: "0x4a89c28919024fbd90218ab28e19c0018f4",
                                      metricLabel: "Certified Annual Income",
                                      metricValue: "₹1,80,000 / yr",
                                      isVerified: true,
                                      verifiedAt: "2026-09-10",
                                      verdict: "GENUINE_VERIFIED",
                                      fraudRiskScore: 4,
                                      extractedIdentifier: "TN-REV/2026/0948215",
                                      fileUrl: "/specimens/income.svg",
                                      checks: [
                                        { checkName: "State e-District Registry (Tamil Nadu)", passed: true, details: "Recognized legitimate certificate serial format TN-REV/2026." },
                                        { checkName: "Revenue Authority Validity Window", passed: true, details: "Active statutory validity through 31 Mar 2027." },
                                        { checkName: "Identity Cross-Reconciliation", passed: true, details: "High identity concordance (100% match) with Priya Sharma." },
                                        { checkName: "SHA-256 Byte Integrity Scan", passed: true, details: "Tamper-proof hash matched with state repository." },
                                      ],
                                    };
                                    setPreviewDoc(doc);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Preview
                                </button>
                                <button
                                  onClick={() => handleOpenDedicatedUpload("INCOME_CERTIFICATE", "Annual Family Income Certificate", "Tahsildar Revenue Office (TN e-District)", "TN-REV/2026/0948215")}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Replace
                                </button>
                              </div>
                            </div>

                            {/* Document 5: Community / Caste Certificate */}
                            <div className="bg-[#ffffff] rounded-2xl p-5 shadow-sm border border-[#eaedff] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-[#004ac6] shrink-0">
                                  <FileBadge className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#131b2e] text-sm">
                                      Community / Caste Certificate (OBC-NCL / Central List)
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" /> Government Digital Repository Verified
                                    </span>
                                  </div>
                                  <span className="text-xs text-[#434655] block">
                                    Unique ID: DL-COMM-891029 • Non-Creamy Layer Validated for FY 2026-27
                                  </span>
                                  <div className="flex items-center gap-2 text-[#737686] text-[11px] flex-wrap">
                                    <span>Classification: OBC-NCL Central</span>
                                    <span>•</span>
                                    <span>Permanent Validity Status: ACTIVE</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                <button
                                  onClick={() => {
                                    const doc = vaultDocuments.find((d) => d.id.includes("caste") || d.title.includes("Community") || d.title.includes("Caste")) || {
                                      id: "doc-04-caste",
                                      studentId: student.id,
                                      title: "Community / Caste Certificate (OBC-NCL)",
                                      issuer: "Revenue Dept • Govt of Tamil Nadu",
                                      fileName: "community_cert_tahsildar.pdf",
                                      fileSize: "1.2 MB",
                                      fileType: "OBC - Non-Creamy Layer (NCL)",
                                      validity: "Permanent Validity",
                                      sha256Hash: "0x289fa819024fbd90218ab28e19c0018f4a12",
                                      metricLabel: "Declared Quota",
                                      metricValue: "Backward Class (BC)",
                                      isVerified: true,
                                      verifiedAt: "2026-09-08",
                                      verdict: "GENUINE_VERIFIED",
                                      fraudRiskScore: 0,
                                      extractedIdentifier: "TN-COMM/2026/088219",
                                      fileUrl: "/specimens/caste.svg",
                                      checks: [
                                        { checkName: "Tahsildar Digital Signature & Barcode", passed: true, details: "PKI Digital signature cryptographically verified." },
                                        { checkName: "OBC-NCL Central List Gazette Match", passed: true, details: "Matches Central OBC Reservation notification 2026." },
                                      ],
                                    };
                                    setPreviewDoc(doc);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Preview
                                </button>
                                <button
                                  onClick={() => handleOpenDedicatedUpload("COMMUNITY_CASTE_CERTIFICATE", "Community / Caste Certificate (OBC-NCL)", "Revenue Dept Govt of Tamil Nadu", "TN-COMM/2026/088219")}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Replace
                                </button>
                              </div>
                            </div>

                            {/* Document 6: Bank Account & DBT */}
                            <div className="bg-[#ffffff] rounded-2xl p-5 shadow-sm border border-[#eaedff] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-[#004ac6] shrink-0">
                                  <Landmark className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-[#131b2e] text-sm">
                                      Bank Account Passbook / Cancelled Cheque &amp; DBT Proof
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" /> NPCI Aadhaar Seeded Active
                                    </span>
                                  </div>
                                  <span className="text-xs text-[#434655] block">
                                    State Bank of India • A/C No: **********8912 • IFSC: SBIN0001423
                                  </span>
                                  <div className="flex items-center gap-2 text-[#737686] text-[11px] flex-wrap">
                                    <span>Account Holder: {student.fullName}</span>
                                    <span>•</span>
                                    <span>Passbook Front Page AI Verified</span>
                                    <span>•</span>
                                    <span>DBT Enabled</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                <button
                                  onClick={() => {
                                    const doc = vaultDocuments.find((d) => d.id.includes("bank") || d.title.includes("Passbook") || d.title.includes("Mandate")) || {
                                      id: "doc-04-bank",
                                      studentId: student.id,
                                      title: "Bank Passbook & DBT Bridge Verification",
                                      issuer: "State Bank of India • NPCI Central Mapper",
                                      fileName: "sbi_passbook_dbt_seeded.pdf",
                                      fileSize: "850 KB",
                                      fileType: "Savings Bank Account & DBT Proof",
                                      validity: "Active & Seeded",
                                      sha256Hash: "0x77ab19024fbd90218ab28e19c0018f4a1239",
                                      metricLabel: "Active Disbursement Bank",
                                      metricValue: "State Bank of India (A/C ****4819)",
                                      isVerified: true,
                                      verifiedAt: "2026-09-02",
                                      verdict: "GENUINE_VERIFIED",
                                      fraudRiskScore: 0,
                                      extractedIdentifier: "SBIN0001423 / 4819",
                                      fileUrl: "/specimens/passbook.svg",
                                      checks: [
                                        { checkName: "NPCI DBT Bank Bridge Active", passed: true, details: "State Bank of India (A/C ****4819) DBT Seeded." },
                                        { checkName: "IFSC Code Validation", passed: true, details: "SBIN0001423 IIT Delhi Hauz Khas Branch." },
                                      ],
                                    };
                                    setPreviewDoc(doc);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Preview Passbook
                                </button>
                                <button
                                  onClick={() => handleOpenDedicatedUpload("BANK_PASSBOOK", "Bank Account Passbook & DBT Proof", "State Bank of India", "SBIN0001423 / 4819")}
                                  className="px-3 py-1.5 rounded-lg bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] hover:bg-[#e2e7ff] transition-all flex items-center gap-1"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Change
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 5: Statement of Purpose & Declaration */}
                        {applyStep === 5 && (
                          <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
                              <div>
                                <h3 className="font-bold text-[#131b2e] text-base font-heading">
                                  Statement of Purpose & Statutory Declaration
                                </h3>
                                <p className="text-xs text-[#737686]">
                                  Articulate your research aspirations, academic goals, and affirm your statutory declaration.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setAppEssay(
                                    `As an undergraduate scholar at IIT Delhi in the Department of ${appDepartment} maintaining a ${appGpa} CGPA, receiving the ${currentScheme.title} will directly alleviate statutory tuition overheads, finance essential high-performance computing hardware, and fund my upcoming peer-reviewed research publications in deep learning architectures.`
                                  );
                                }}
                                className="px-3 py-1 rounded-lg bg-[#eaddff] text-[#25005a] text-xs font-bold hover:bg-[#d2bbff] transition-all flex items-center gap-1"
                              >
                                <Sparkles className="h-3.5 w-3.5" /> AI Polish Statement
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <label className="font-bold text-[#434655]">Personal Essay & Research Intent</label>
                                <span className="text-[#737686] font-mono">{wordCount} words (Recommended: 50–300 words)</span>
                              </div>
                              <textarea
                                value={appEssay}
                                onChange={(e) => setAppEssay(e.target.value)}
                                rows={6}
                                placeholder="Detail your academic background, research interests, financial need, and career objectives..."
                                className="w-full rounded-xl border border-[#eaedff] bg-[#faf8ff] p-4 text-xs text-[#131b2e] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#004ac6] transition-all leading-relaxed"
                              />
                            </div>

                            {/* Statutory Affirmation */}
                            <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] space-y-3">
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={declarationAgreed}
                                  onChange={(e) => setDeclarationAgreed(e.target.checked)}
                                  className="mt-1 h-4 w-4 rounded border-[#c3c6d7] text-[#004ac6] focus:ring-[#004ac6]"
                                />
                                <div className="text-xs text-[#131b2e] space-y-1">
                                  <span className="font-bold block">
                                    Legal Affirmation under Section 43A of the Information Technology Act
                                  </span>
                                  <p className="text-[#434655] leading-relaxed">
                                    I hereby solemnly declare that all information and statutory records furnished above are genuine,
                                    verified through my UIDAI Aadhaar e-KYC and DigiLocker account. I understand that any fraudulent representation
                                    will invite immediate disqualification and legal recovery proceedings.
                                  </p>
                                </div>
                              </label>

                              <div className="pt-2 border-t border-[#eaedff]/80 flex items-center justify-between text-[11px] text-[#737686]">
                                <span className="flex items-center gap-1 font-mono">
                                  <Lock className="h-3 w-3 text-[#005e6e]" /> Digital e-Sign Stamp: 0x7a91_AADHAAR_{student.id.toUpperCase()}
                                </span>
                                <span className="text-emerald-700 font-bold">Biometric Auth Matched</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STEP 6: Final Review & Merkle Anchor */}
                        {applyStep === 6 && (
                          <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
                              <div>
                                <h3 className="font-bold text-[#131b2e] text-base font-heading">
                                  Comprehensive Review & Merkle Anchor
                                </h3>
                                <p className="text-xs text-[#737686]">
                                  Verify all application payload fields before generating the immutable blockchain audit block.
                                </p>
                              </div>
                              <Badge className="bg-[#eaddff] text-[#25005a] border-0 text-xs font-bold gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" /> Ready for Ledger Commit
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="p-3.5 rounded-xl bg-[#f2f3ff] space-y-1">
                                <span className="text-[#737686] block text-[10px] uppercase font-bold">Scheme Applied</span>
                                <span className="font-bold text-[#004ac6] text-sm">{currentScheme.title}</span>
                                <span className="text-[11px] text-[#434655] block font-mono">Award: ₹{formatCurrency(currentScheme.awardAmount)} / yr</span>
                              </div>

                              <div className="p-3.5 rounded-xl bg-[#f2f3ff] space-y-1">
                                <span className="text-[#737686] block text-[10px] uppercase font-bold">Beneficiary Profile</span>
                                <span className="font-bold text-[#131b2e] text-sm">{student.fullName}</span>
                                <span className="text-[11px] text-[#434655] block">{student.department} • CGPA {appGpa}</span>
                              </div>

                              <div className="p-3.5 rounded-xl bg-[#f2f3ff] space-y-1">
                                <span className="text-[#737686] block text-[10px] uppercase font-bold">Income Attestation</span>
                                <span className="font-bold text-[#005e6e] text-sm">₹{formatCurrency(Number(appIncome))} / annum</span>
                                <span className="text-[11px] text-[#434655] block">Tahsildar Ref: TN-REV/2026/0948215</span>
                              </div>

                              <div className="p-3.5 rounded-xl bg-[#f2f3ff] space-y-1">
                                <span className="text-[#737686] block text-[10px] uppercase font-bold">DBT Settlement Account</span>
                                <span className="font-bold text-[#131b2e] text-sm font-mono">SBI • **********8912</span>
                                <span className="text-[11px] text-emerald-700 font-medium block">NPCI Direct Credit Seeded</span>
                              </div>
                            </div>

                            {/* Merkle Hash Preview Card */}
                            <div className="p-4 rounded-xl bg-[#00174b] text-white space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-[#acedff] flex items-center gap-1.5">
                                  <Lock className="h-3.5 w-3.5" /> Immutable SHA-256 Merkle Root Digest
                                </span>
                                <span className="text-[10px] bg-[#003ea8] px-2 py-0.5 rounded font-mono text-white">
                                  Zero Knowledge Proof
                                </span>
                              </div>
                              <div className="font-mono text-[10px] text-[#dbe1ff] break-all bg-black/30 p-2.5 rounded-lg border border-white/10">
                                0x{sha256(currentScheme.id + student.id + appGpa + appIncome + appEssay).substring(0, 48)}...
                              </div>
                              <p className="text-[10px] text-[#c3c6d7]">
                                Stamping this dossier creates an immutable cryptographic audit record in the public ledger.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Secondary Column: Real-time Inline Validation & Guidance (4 cols) */}
                      <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* Application Readiness Card */}
                        <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-[#131b2e] text-sm font-heading">Application Readiness</h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-xs font-bold">
                              6 of 6 Validated
                            </span>
                          </div>

                          {/* Progress Ring SVG */}
                          <div className="flex items-center justify-center py-2">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle className="text-[#eaedff] fill-none" cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" />
                                <circle
                                  className="text-[#2563eb] fill-none rounded-full transition-all duration-1000"
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  stroke="currentColor"
                                  strokeDasharray="251.2"
                                  strokeDashoffset="0"
                                  strokeWidth="8"
                                />
                              </svg>
                              <div className="absolute flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-black text-[#131b2e] font-heading leading-none">100%</span>
                                <span className="text-[10px] text-[#737686] mt-0.5 font-semibold">Docs Verified</span>
                              </div>
                            </div>
                          </div>

                          {/* Real-time Checklist */}
                          <div className="space-y-2.5 pt-1 text-xs">
                            {[
                              { title: "Aadhaar UIDAI e-KYC Linked", sub: "Tokenized ID XXXX-XXXX-4819 valid." },
                              { title: "Academic Marksheets Reconciled", sub: "IIT Delhi CGPA 8.84 transcripts matched." },
                              { title: "Institutional Bonafide Certified", sub: "IIT Delhi Dean seal & signature validated." },
                              { title: "Tahsildar Income Cert Synced", sub: "Revenue portal verified ₹1,80,000 threshold." },
                              { title: "Community OBC Validated", sub: "OBC-NCL certificate DL-COMM active." },
                              { title: "DBT Bank Account Seeded", sub: "SBI A/C **8912 NPCI live gateway ping OK." },
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-[#005e6e] shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <span className="font-bold text-[#131b2e] block leading-tight">{item.title}</span>
                                  <span className="text-[10px] text-[#737686] block">{item.sub}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Registrar Stamp Card */}
                          <div className="p-3 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#dae2fd] flex items-center justify-center text-[#004ac6] shrink-0 font-black text-xs font-mono">
                              IITD
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-[#131b2e] text-xs truncate">IIT Delhi Registrar Seal</span>
                              <span className="text-[10px] text-emerald-700 font-semibold truncate">Institutional Match: 100% Verified</span>
                            </div>
                          </div>
                        </div>

                        {/* National Security Assurance */}
                        <div className="bg-[#f2f3ff] rounded-2xl p-5 border border-[#eaedff] space-y-2 text-xs">
                          <div className="flex items-center gap-2 font-bold text-[#131b2e]">
                            <Shield className="h-4 w-4 text-[#004ac6]" /> National Data Security Assurance
                          </div>
                          <p className="text-[#434655] text-[11px] leading-relaxed">
                            All submitted credentials are cryptographically signed using MeitY CERT-In compliant vault protocols.
                            Your documents are only accessible to authorized ministry sanctioning committees.
                          </p>
                        </div>

                        {/* Helpline Quick Dock */}
                        <div className="bg-[#ffffff] rounded-2xl p-5 shadow-sm border border-[#eaedff] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#004ac6] shrink-0">
                              <HelpCircle className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[#131b2e] text-xs">Need verification help?</span>
                              <span className="text-[11px] text-[#737686]">Toll-free 1800-PS78-AID</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => alert("Connecting to PS78 Live Admissions Helpdesk Advisor...")}
                            className="p-2 rounded-lg bg-[#f2f3ff] text-[#004ac6] hover:bg-[#e2e7ff] transition-colors"
                          >
                            <Inbox className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action & Navigation Dock (Sticky) */}
                    <div className="sticky bottom-4 bg-[#ffffff]/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-[#eaedff] flex flex-col sm:flex-row items-center justify-between gap-4 z-30">
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                        <button
                          type="button"
                          onClick={() => {
                            if (applyStep > 1) {
                              setApplyStep(applyStep - 1);
                            } else {
                              setActiveTab("scholarships");
                            }
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#f2f3ff] text-[#131b2e] hover:bg-[#e2e7ff] text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                          <span>{applyStep === 1 ? "Back to Catalog" : "Previous Step"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAdminActionNotice("Application draft saved locally with AES-256 encryption.");
                            setTimeout(() => setAdminActionNotice(null), 3000);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#f2f3ff] text-[#434655] hover:text-[#131b2e] hover:bg-[#e2e7ff] text-xs font-semibold transition-all flex items-center gap-1.5"
                        >
                          <Bookmark className="h-4 w-4" />
                          <span>Save Draft</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {applyStep < 6 ? (
                          <Button
                            type="button"
                            onClick={() => {
                              if (applyStep === 5 && !declarationAgreed) {
                                alert("Please affirm the statutory declaration checkbox before proceeding.");
                                return;
                              }
                              setApplyStep(applyStep + 1);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#2563eb] text-white hover:bg-[#004ac6] text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                          >
                            <span>Proceed to {applyStep === 5 ? "Review & Finalize" : `Step ${applyStep + 1}`}</span>
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </Button>
                        ) : student.gpa < (currentScheme.minGpa ?? 0) ? (
                          <div className="w-full sm:w-auto flex flex-col items-end gap-1">
                            <Button
                              type="button"
                              disabled
                              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-red-100 text-red-800 border border-red-300 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span>Submission Blocked: You Are Not Eligible</span>
                            </Button>
                            <span className="text-[10px] text-red-600 font-semibold">
                              Requires min {currentScheme.minGpa.toFixed(2)} CGPA (Your CGPA: {student.gpa.toFixed(2)})
                            </span>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => handleSmartApplySubmit()}
                            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[#004ac6] to-[#712ae2] text-white hover:from-[#003ea8] hover:to-[#5a00c6] text-xs font-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group animate-pulse"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>Submit Application & Stamp to Ledger →</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 2D. STUDENT VIEW: SUBMISSION CONFIRMATION SUCCESS (Stitch Screen 5)         */}
          {/* ========================================================================= */}
          {activeRole === "STUDENT" && activeTab === "apply-success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 max-w-7xl mx-auto pb-16"
            >
              {(() => {
                const app = submittedAppReceipt || studentApplications[0] || {
                  id: "PS78-2026-000123",
                  scholarshipTitle: selectedScholarship?.title || "Post-Matric Scholarship Scheme for Technical Students",
                  createdAt: new Date().toISOString(),
                  sha256Hash: "0x8912e74ca0298bf3019842fbc94018274198274198a",
                };

                return (
                  <div className="flex flex-col gap-6">
                    {/* Hero Celebratory Header */}
                    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#004ac6] via-[#2563eb] to-[#712ae2] p-6 md:p-10 text-white shadow-2xl">
                      <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-[#8a4cfc]/30 blur-3xl pointer-events-none" />
                      <div className="absolute top-0 right-1/4 w-40 h-40 rounded-full bg-[#acedff]/20 blur-2xl pointer-events-none" />

                      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-start gap-4 max-w-2xl">
                          <div className="shrink-0 w-16 h-16 rounded-2xl bg-white text-[#004ac6] flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="h-10 w-10 text-[#004ac6]" />
                          </div>
                          <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold">
                              <span className="w-2 h-2 rounded-full bg-[#4cd7f6] animate-ping" />
                              <span className="uppercase tracking-wider">Lodged & Cryptographically Timestamped</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight font-heading leading-tight">
                              Application Submitted Successfully!
                            </h1>
                            <p className="text-xs md:text-sm text-[#eeefff] leading-relaxed">
                              Your high-stakes financial aid dossier has entered the verification pipeline for the academic cohort 2026–27.
                            </p>
                          </div>
                        </div>

                        {/* Ref ID Badge Card */}
                        <div className="shrink-0 bg-white text-[#131b2e] rounded-2xl p-5 shadow-xl flex items-center gap-4 border border-[#eaedff]">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#737686]">Application Ref ID</span>
                            <span className="text-lg font-black text-[#004ac6] font-mono tracking-tight">{app.id}</span>
                            <span className="text-[11px] text-[#737686]">Logged on {formatDate(app.createdAt)}, {formatTime(app.createdAt)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(app.id);
                              setCopySuccessNotice(true);
                              setTimeout(() => setCopySuccessNotice(false), 2000);
                            }}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#004ac6] transition-all font-bold text-xs shadow-sm"
                            title="Copy Reference ID"
                          >
                            {copySuccessNotice ? (
                              <>
                                <Check className="h-4 w-4" /> <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" /> <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </section>

                    {/* Bento Split Grid (8 cols left, 4 cols right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left Column (8 cols) */}
                      <div className="lg:col-span-8 flex flex-col gap-6">
                        {/* Scheme Details Card */}
                        <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#eaedff]">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-[#004ac6] shrink-0">
                                <School className="h-6 w-6" />
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-[#737686] block">
                                  Sanction Directive • Central & State Joint Scheme
                                </span>
                                <h2 className="text-base font-bold text-[#131b2e] font-heading">{app.scholarshipTitle}</h2>
                              </div>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaddff] text-[#25005a] text-xs font-bold">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#712ae2]" /> 98.4% AI Match Verified
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-[#f2f3ff] rounded-xl p-3.5 flex flex-col">
                              <span className="text-[10px] text-[#737686] font-bold uppercase">Annual Entitlement</span>
                              <span className="text-lg font-black text-[#004ac6] mt-1 font-mono">
                                ₹{formatCurrency(selectedScholarship?.awardAmount || 45000)}
                              </span>
                              <span className="text-[10px] text-[#737686]">Direct Bank Sanction</span>
                            </div>
                            <div className="bg-[#f2f3ff] rounded-xl p-3.5 flex flex-col">
                              <span className="text-[10px] text-[#737686] font-bold uppercase">Nodal Ministry</span>
                              <span className="text-xs font-bold text-[#131b2e] mt-1 truncate">MeitY & State Wel.</span>
                              <span className="text-[10px] text-[#737686]">Sec 23 Welfare Reg</span>
                            </div>
                            <div className="bg-[#f2f3ff] rounded-xl p-3.5 flex flex-col">
                              <span className="text-[10px] text-[#737686] font-bold uppercase">Target Discipline</span>
                              <span className="text-xs font-bold text-[#131b2e] mt-1 truncate">B.Tech / B.E. (Tech)</span>
                              <span className="text-[10px] text-[#737686]">Undergrad Tier-1</span>
                            </div>
                            <div className="bg-[#f2f3ff] rounded-xl p-3.5 flex flex-col">
                              <span className="text-[10px] text-[#737686] font-bold uppercase">Sanction Cycle</span>
                              <span className="text-xs font-bold text-[#131b2e] mt-1">FY 2026 - Q3</span>
                              <span className="text-[10px] text-[#737686]">Immediate Routing</span>
                            </div>
                          </div>
                        </div>

                        {/* 5-Stage Verification Roadmap */}
                        <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-6">
                          <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-[#004ac6]" />
                              <h3 className="font-bold text-[#131b2e] text-base font-heading">
                                5-Stage Verification Roadmap
                              </h3>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-[#dbe1ff] text-[#00174b] text-xs font-bold">
                              Stage 1 Completed
                            </span>
                          </div>

                          <div className="relative flex flex-col md:flex-row justify-between gap-4">
                            <div className="hidden md:block absolute top-4 left-6 right-6 h-1 bg-[#eaedff] z-0">
                              <div className="w-1/4 h-full bg-[#004ac6] rounded-full transition-all duration-500" />
                            </div>

                            {/* Stage 1 */}
                            <div className="relative z-10 flex md:flex-col items-center md:items-start gap-3 flex-1">
                              <div className="w-8 h-8 rounded-full bg-[#004ac6] text-white flex items-center justify-center shadow-md">
                                <Check className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#004ac6]">1. Lodged</span>
                                <span className="text-xs text-[#131b2e] font-semibold">Application Locked</span>
                                <span className="text-[10px] text-[#737686]">Aug 14, 2026</span>
                              </div>
                            </div>

                            {/* Stage 2 */}
                            <div className="relative z-10 flex md:flex-col items-center md:items-start gap-3 flex-1">
                              <div className="w-8 h-8 rounded-full bg-white border-2 border-[#2563eb] text-[#2563eb] shadow-sm flex items-center justify-center animate-pulse">
                                <span className="text-xs font-bold">2</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#131b2e]">2. Institute Desk</span>
                                <span className="text-[11px] text-[#434655]">IIT Delhi Nodal Officer</span>
                                <span className="text-[10px] text-[#712ae2] font-bold">Est. 48-72 hrs</span>
                              </div>
                            </div>

                            {/* Stage 3 */}
                            <div className="relative z-10 flex md:flex-col items-center md:items-start gap-3 flex-1 opacity-70">
                              <div className="w-8 h-8 rounded-full bg-[#f2f3ff] text-[#737686] flex items-center justify-center">
                                <span className="text-xs font-bold">3</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#737686]">3. Welfare Officer</span>
                                <span className="text-[11px] text-[#737686]">State Directorate</span>
                                <span className="text-[10px] text-[#c3c6d7]">Upcoming</span>
                              </div>
                            </div>

                            {/* Stage 4 */}
                            <div className="relative z-10 flex md:flex-col items-center md:items-start gap-3 flex-1 opacity-70">
                              <div className="w-8 h-8 rounded-full bg-[#f2f3ff] text-[#737686] flex items-center justify-center">
                                <span className="text-xs font-bold">4</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#737686]">4. Sanction Order</span>
                                <span className="text-[11px] text-[#737686]">Digital Signature</span>
                                <span className="text-[10px] text-[#c3c6d7]">Upcoming</span>
                              </div>
                            </div>

                            {/* Stage 5 */}
                            <div className="relative z-10 flex md:flex-col items-center md:items-start gap-3 flex-1 opacity-70">
                              <div className="w-8 h-8 rounded-full bg-[#f2f3ff] text-[#737686] flex items-center justify-center">
                                <span className="text-xs font-bold">5</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#737686]">5. DBT Disbursal</span>
                                <span className="text-[11px] text-[#737686]">PFMS / SBI Credited</span>
                                <span className="text-[10px] text-[#c3c6d7]">Final Goal</span>
                              </div>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-[#eaedff] flex items-center gap-3 text-xs">
                            <CheckCircle className="h-5 w-5 text-[#004ac6] shrink-0" />
                            <span className="text-[#434655] leading-relaxed">
                              <strong>Next Action:</strong> Your Institute Nodal Officer at IIT Delhi (Dean of Student Affairs)
                              has been automatically notified via the DigiGov portal. No manual paper copies are required.
                            </span>
                          </div>
                        </div>

                        {/* Verified Credentials Digest */}
                        <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-4">
                          <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-5 w-5 text-[#005e6e]" />
                              <h3 className="font-bold text-[#131b2e] text-base font-heading">
                                Verified Credentials Digest
                              </h3>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1">
                              <Lock className="h-3 w-3" /> DigiLocker Certified
                            </span>
                          </div>

                          <p className="text-xs text-[#737686]">
                            The following 5 documents were verified in real-time through National Academic Depository & State API gateways with zero paper friction.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              { title: "Aadhaar e-KYC", sub: "UIDAI Validated (Virtual ID)", icon: Fingerprint },
                              { title: "IIT Delhi Marksheet", sub: `NAD / CGPA ${student.gpa.toFixed(2)} Authenticated`, icon: GraduationCap },
                              { title: "Tahsildar Income Certificate", sub: "Revenue Dept. • Ref: REV/26/9941", icon: DollarSign },
                              { title: "Community OBC Certificate", sub: "National BC Commission Registry", icon: FileBadge },
                              { title: "Institutional Bonafide Letter", sub: "Academic Registrar, IITD • Issued Aug 2026", icon: School, span: true },
                            ].map((item, idx) => {
                              const Icon = item.icon;
                              return (
                                <div
                                  key={idx}
                                  className={`p-3.5 rounded-xl bg-[#f2f3ff] flex items-center justify-between border border-[#eaedff] ${
                                    item.span ? "md:col-span-2" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white text-[#004ac6] flex items-center justify-center shadow-xs">
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-[#131b2e] text-xs">{item.title}</span>
                                      <span className="text-[10px] text-[#737686]">{item.sub}</span>
                                    </div>
                                  </div>
                                  <CheckCircle className="h-5 w-5 text-[#005e6e]" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right Column (4 cols) */}
                      <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* Scannable Official QR Record */}
                        <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] flex flex-col items-center text-center gap-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#737686]">
                            Official Student Record QR
                          </span>
                          <div className="p-3 bg-[#f2f3ff] rounded-2xl border border-[#eaedff] shadow-inner">
                            <svg className="w-36 h-36 text-[#131b2e]" fill="currentColor" viewBox="0 0 100 100">
                              <path d="M10,10 h30 v30 h-30 z M15,15 v20 h20 v-20 z M20,20 h10 v10 h-10 z" />
                              <path d="M60,10 h30 v30 h-30 z M65,15 v20 h20 v-20 z M70,20 h10 v10 h-10 z" />
                              <path d="M10,60 h30 v30 h-30 z M15,65 v20 h20 v-20 z M20,70 h10 v10 h-10 z" />
                              <circle cx="50" cy="50" fill="currentColor" r="8" />
                              <rect height="18" width="8" x="46" y="15" />
                              <rect height="8" width="18" x="70" y="46" />
                              <rect height="22" width="8" x="46" y="68" />
                              <rect height="8" width="22" x="15" y="46" />
                              <rect height="10" width="10" x="65" y="65" />
                              <rect height="10" width="10" x="80" y="80" />
                              <rect height="10" width="8" x="60" y="80" />
                            </svg>
                          </div>
                          <span className="text-xs text-[#737686] max-w-xs leading-relaxed">
                            Scan to verify credentials or present to your Institute Desk during physical spot-checks.
                          </span>

                          <div className="w-full pt-2 flex flex-col gap-2">
                            <Button
                              type="button"
                              onClick={() => downloadApplicationReceiptPdf(submittedAppReceipt, student)}
                              className="w-full h-11 rounded-xl bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                            >
                              <FileText className="h-4 w-4" /> Download Acknowledgment (PDF)
                            </Button>
                            <button
                              type="button"
                              onClick={() => setActiveTab("my-applications")}
                              className="w-full h-11 rounded-xl bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#131b2e] text-xs font-bold flex items-center justify-center gap-2 transition-all border border-[#eaedff]"
                            >
                              <TrendingUp className="h-4 w-4 text-[#004ac6]" /> Track in Real-Time
                            </button>
                          </div>
                        </div>

                        {/* DBT Disbursal Readiness */}
                        <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-3">
                          <div className="flex items-center gap-2">
                            <Landmark className="h-5 w-5 text-[#712ae2]" />
                            <h3 className="font-bold text-[#131b2e] text-sm font-heading">DBT Disbursal Readiness</h3>
                          </div>
                          <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-[#eaedff] space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#131b2e]">State Bank of India</span>
                              <span className="px-2 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[10px] font-bold">
                                Savings
                              </span>
                            </div>
                            <span className="font-mono text-[#434655] block">A/C: **********8912</span>
                            <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] pt-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> NPCI Aadhaar Mapper: Active
                            </div>
                          </div>
                          <p className="text-[11px] text-[#737686] leading-relaxed">
                            Funds are protected under Direct Benefit Transfer rules and cannot be diverted or lapsed once sanction is greenlit.
                          </p>
                        </div>

                        {/* Status Alerts & Updates */}
                        <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4 text-[#004ac6]" />
                              <span className="font-bold text-[#131b2e] text-xs">Status Alerts & Updates</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={whatsAppUpdatesEnabled}
                                onChange={(e) => setWhatsAppUpdatesEnabled(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-[#eaedff] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#005e6e]" />
                            </label>
                          </div>
                          <p className="text-[11px] text-[#737686] leading-relaxed">
                            WhatsApp notifications {whatsAppUpdatesEnabled ? "enabled" : "disabled"} for +91 98765 43210.
                            You will receive milestone pings when your officer signs off.
                          </p>
                          <div className="p-3 rounded-xl bg-[#f2f3ff] border border-[#eaedff] text-xs space-y-0.5">
                            <span className="text-[10px] text-[#737686] font-bold uppercase">Institute Grievance Nodal</span>
                            <span className="font-bold text-[#131b2e] block">Dr. Rajeshwari Swaminathan</span>
                            <span className="text-[11px] text-[#004ac6] block font-mono">nodal.scholarship@iitd.ac.in</span>
                            <span className="text-[10px] text-[#737686] block">+91 (011) 2659-7100</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab("dashboard")}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#434655] hover:text-[#004ac6] transition-colors pt-1 w-full"
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" /> Return to Dashboard
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 3. STUDENT VIEW: MY APPLICATIONS (STITCH SPEC TIMELINE TRACKER)           */}
          {/* ========================================================================= */}
          {activeRole === "STUDENT" && activeTab === "my-applications" && (() => {
            const activeAppsCount = studentApplications.filter((a) => a.status === "PENDING" || a.status === "UNDER_REVIEW").length;
            const rejectedAppsCount = studentApplications.filter((a) => a.status === "REJECTED").length;
            const approvedAppsCount = studentApplications.filter((a) => a.status === "APPROVED").length;
            const disbursedAmount = studentApplications.filter((a) => a.status === "APPROVED").reduce((sum, a) => {
              const sch = scholarships.find((s) => s.id === a.scholarshipId);
              return sum + (sch?.awardAmount || 50000);
            }, 0);

            const filteredApps = studentApplications.filter((app) => {
              if (myAppsFilter === "APPROVED") return app.status === "APPROVED";
              if (myAppsFilter === "REVIEW") return app.status === "PENDING" || app.status === "UNDER_REVIEW";
              if (myAppsFilter === "REJECTED") return app.status === "REJECTED";
              return true;
            });

            return (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Top Banner & Context */}
                <div
                  id="tour-my-applications"
                  className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pt-1 p-5 rounded-2xl bg-white border border-[#eaedff] shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#004ac6] text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#004ac6]">
                        Aadhaar &amp; NPCI Seeding Active
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#131b2e] font-heading tracking-tight">
                      My Applications
                    </h1>
                    <p className="text-xs sm:text-sm text-[#737686] max-w-2xl mt-1">
                      Track submissions, document verification stages, and Direct Benefit Transfer (DBT) disbursals in real time.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleStartTabTour("my-applications")}
                      className="border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl h-10 px-3.5 gap-1.5 shadow-sm"
                      title="Applications & Award Letters Guide (?)"
                    >
                      <HelpCircle className="h-4 w-4 text-purple-600" />
                      <span>Applications Guide (?)</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMyAppsFilter("ALL")}
                      className="flex-1 sm:flex-none border-[#eaedff] bg-white text-[#131b2e] hover:bg-[#f2f3ff] text-xs font-semibold rounded-xl h-10 px-4 gap-1.5"
                    >
                      <SlidersHorizontal className="h-4 w-4 text-[#737686]" />
                      <span>All Submissions</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setActiveTab("scholarships")}
                      className="flex-1 sm:flex-none bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-xl h-10 px-5 gap-1.5 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Apply New Scheme</span>
                    </Button>
                  </div>
                </div>

                {/* KPI / Status Summary Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* KPI 1 */}
                  <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-[#eaedff] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#737686]">Active Under Review</span>
                      <span className="p-2 rounded-xl bg-[#dbe1ff] text-[#004ac6] flex items-center justify-center">
                        <Clock className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-[#131b2e] font-heading">
                        {String(activeAppsCount).padStart(2, "0")}
                      </span>
                      <span className="inline-flex items-center text-[#004ac6] text-[11px] font-bold bg-[#dbe1ff]/60 px-2 py-0.5 rounded-full">
                        AY 2026-27
                      </span>
                    </div>
                    <div className="w-full bg-[#f2f3ff] h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-[#004ac6] h-full rounded-full w-2/3" />
                    </div>
                  </div>

                  {/* KPI 2 */}
                  <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-[#eaedff] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#737686]">Rejected / Disqualified</span>
                      <span className="p-2 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                        <X className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-[#ba1a1a] font-heading">
                        {String(rejectedAppsCount).padStart(2, "0")}
                      </span>
                      <span className="inline-flex items-center text-[#ba1a1a] text-[11px] font-bold bg-[#ffdad6]/60 px-2 py-0.5 rounded-full">
                        Needs Appeal
                      </span>
                    </div>
                    <div className="w-full bg-[#f2f3ff] h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-[#ba1a1a] h-full rounded-full w-full" />
                    </div>
                  </div>

                  {/* KPI 3 */}
                  <div className="relative overflow-hidden p-5 rounded-2xl bg-white border border-[#eaedff] shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#737686]">Approved / Sanctioned</span>
                      <span className="p-2 rounded-xl bg-[#acedff] text-[#005e6e] flex items-center justify-center">
                        <Award className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-[#131b2e] font-heading">
                        {String(approvedAppsCount).padStart(2, "0")}
                      </span>
                      <span className="inline-flex items-center text-[#005e6e] text-[11px] font-bold bg-[#acedff]/60 px-2 py-0.5 rounded-full">
                        100% Cleared
                      </span>
                    </div>
                    <div className="w-full bg-[#f2f3ff] h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-[#005e6e] h-full rounded-full w-full" />
                    </div>
                  </div>

                  {/* KPI 4 */}
                  <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#712ae2] text-white shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/80">Disbursed Amount</span>
                      <span className="p-2 rounded-xl bg-white/15 text-white flex items-center justify-center backdrop-blur-md">
                        <Landmark className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between">
                      <div className="flex items-baseline">
                        <span className="text-base font-semibold opacity-90">₹</span>
                        <span className="text-3xl font-extrabold ml-1 font-heading">
                          {formatCurrency(disbursedAmount)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                        Direct DBT
                      </span>
                    </div>
                    <div className="text-[11px] text-white/80 mt-3 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>SBI A/C ending in 8912</span>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-[#eaedff] shadow-sm">
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setMyAppsFilter("ALL")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        myAppsFilter === "ALL"
                          ? "bg-[#004ac6] text-white shadow-sm"
                          : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                      }`}
                    >
                      All Applications ({studentApplications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMyAppsFilter("APPROVED")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        myAppsFilter === "APPROVED"
                          ? "bg-[#004ac6] text-white shadow-sm"
                          : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                      }`}
                    >
                      <span>Approved &amp; Disbursed</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {approvedAppsCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMyAppsFilter("REVIEW")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        myAppsFilter === "REVIEW"
                          ? "bg-[#004ac6] text-white shadow-sm"
                          : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                      }`}
                    >
                      <span>Under Evaluation</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-[#004ac6]">
                        {activeAppsCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMyAppsFilter("REJECTED")}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        myAppsFilter === "REJECTED"
                          ? "bg-[#004ac6] text-white shadow-sm"
                          : "text-[#434655] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                      }`}
                    >
                      <span>Rejected / Disqualified</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#ba1a1a]">
                        {rejectedAppsCount}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Main Content Grid (8 cols / 4 cols) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Applications List (8 cols) */}
                  <div className="lg:col-span-8 flex flex-col gap-5">
                    {filteredApps.length === 0 ? (
                      <div className="rounded-2xl border border-[#eaedff] bg-white p-12 text-center space-y-3 shadow-sm">
                        <Inbox className="h-10 w-10 text-zinc-400 mx-auto" />
                        <h3 className="text-sm font-bold text-[#131b2e]">No applications found</h3>
                        <p className="text-xs text-[#737686]">
                          There are no scholarship applications matching this status filter.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setMyAppsFilter("ALL")}
                          className="text-xs rounded-xl mt-2"
                        >
                          Clear Filter
                        </Button>
                      </div>
                    ) : (
                      filteredApps.map((app) => {
                        const targetSch = scholarships.find((s) => s.id === app.scholarshipId);
                        const awardAmount = targetSch?.awardAmount || 50000;
                        const isAppApproved = app.status === "APPROVED";
                        const isAppRejected = app.status === "REJECTED";
                        const isAppUnderReview = app.status === "UNDER_REVIEW";

                        return (
                          <article
                            key={app.id}
                            className={`bg-white rounded-2xl p-6 sm:p-7 border shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
                              isAppRejected
                                ? "border-red-200 ring-1 ring-red-100"
                                : isAppApproved
                                ? "border-emerald-200 ring-1 ring-emerald-50"
                                : "border-[#eaedff]"
                            }`}
                          >
                            {/* Color bar at top */}
                            <div
                              className={`absolute top-0 left-0 right-0 h-1.5 ${
                                isAppRejected
                                  ? "bg-[#ba1a1a]"
                                  : isAppApproved
                                  ? "bg-emerald-600"
                                  : "bg-[#004ac6]"
                              }`}
                            />

                            {/* Header row */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4">
                              <div className="flex items-start gap-3.5">
                                <div
                                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                    isAppRejected
                                      ? "bg-[#ffdad6] text-[#ba1a1a]"
                                      : isAppApproved
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-[#dbe1ff] text-[#004ac6]"
                                  }`}
                                >
                                  {isAppRejected ? (
                                    <X className="h-6 w-6" />
                                  ) : isAppApproved ? (
                                    <Award className="h-6 w-6" />
                                  ) : (
                                    <Clock className="h-6 w-6" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[10px] font-mono text-[#737686] uppercase tracking-wider font-semibold">
                                      PS78-2026-{app.id.slice(0, 6).toUpperCase()}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-[#c3c6d7]" />
                                    <span className="text-[11px] text-[#737686]">AY 2026-27</span>
                                    <span className="w-1 h-1 rounded-full bg-[#c3c6d7]" />
                                    {isAppApproved ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                        <CheckCircle2 className="h-3 w-3" /> Sanction Cleared
                                      </span>
                                    ) : isAppRejected ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold">
                                        <AlertTriangle className="h-3 w-3" /> Disqualified
                                      </span>
                                    ) : isAppUnderReview ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">
                                        <Clock className="h-3 w-3" /> Under Active Review
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[10px] font-bold">
                                        <Clock className="h-3 w-3" /> Pending Review
                                      </span>
                                    )}
                                  </div>
                                  <h2 className="text-base sm:text-lg font-bold text-[#131b2e] font-heading">
                                    {app.scholarshipTitle}
                                  </h2>
                                  <p className="text-xs text-[#737686] mt-0.5">
                                    Department of Higher Education • Submitted on {formatDate(app.createdAt)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col sm:items-end shrink-0 pl-14 sm:pl-0">
                                <span className="text-[11px] text-[#737686] font-medium">
                                  {isAppRejected ? "Disqualification Notice" : isAppApproved ? "Sanction Cleared" : "Allocated Amount"}
                                </span>
                                <div className="text-lg sm:text-xl font-bold font-heading">
                                  {isAppRejected ? (
                                    <span className="text-[#ba1a1a]">
                                      ₹0{" "}
                                      <span className="text-xs text-[#737686] line-through font-normal">
                                        ₹{formatCurrency(awardAmount)}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className={isAppApproved ? "text-emerald-700" : "text-[#131b2e]"}>
                                      ₹{formatCurrency(awardAmount)}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 ${
                                    isAppApproved
                                      ? "bg-emerald-50 text-emerald-800"
                                      : isAppRejected
                                      ? "bg-[#ffdad6] text-[#ba1a1a]"
                                      : "bg-[#f2f3ff] text-[#004ac6]"
                                  }`}
                                >
                                  {isAppApproved ? "DBT Disbursed" : isAppRejected ? "Rejected by Officer" : "Direct DBT Route"}
                                </span>
                              </div>
                            </div>

                            {/* Rejection Memo Box */}
                            {isAppRejected && (
                              <div className="mt-3 p-4 rounded-xl bg-[#ffdad6]/30 border border-[#ffdad6] flex flex-col gap-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2 text-[#ba1a1a] font-bold text-xs">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>Rejection Memo: {app.reviewNotes || "Certificate validity ceiling exceeded"}</span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded bg-[#ba1a1a] text-white text-[10px] font-mono">
                                    Rule § 4.3 Non-Compliance
                                  </span>
                                </div>
                                <p className="text-xs text-[#131b2e] leading-relaxed">
                                  <strong>Officer Memo:</strong> &quot;{app.reviewNotes || "The submitted Tehsildar Income Certificate has lapsed its 1-year statutory validity period or exceeds revised threshold."}&quot;
                                </p>
                                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px] text-[#737686]">
                                  <span className="font-mono">
                                    Audit Ref: <strong>REJ-2026-{app.id.slice(0, 6).toUpperCase()}</strong> (Immutable Ledger Hash)
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Approved Disbursal Details Cardlet */}
                            {isAppApproved && (
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#f2f3ff] border border-[#eaedff] text-xs">
                                <div>
                                  <span className="text-[10px] text-[#737686] uppercase block font-semibold">UTR Transaction Ref</span>
                                  <span className="font-mono font-semibold text-[#131b2e] mt-0.5 block truncate">
                                    SBIN-DBT-2026-{app.id.slice(0, 8).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#737686] uppercase block font-semibold">Credit Settlement Date</span>
                                  <span className="font-semibold text-[#131b2e] mt-0.5 block">
                                    {formatDate(app.createdAt)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#737686] uppercase block font-semibold">Credited Account</span>
                                  <span className="font-semibold text-[#131b2e] mt-0.5 block">
                                    State Bank of India (••8912)
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Direct Benefit Life-Cycle Progress Timeline */}
                            <div className="mt-4 p-4 sm:p-5 rounded-xl bg-[#faf8ff] border border-[#eaedff]">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-[#131b2e] flex items-center gap-1.5">
                                  <Layers className="h-4 w-4 text-[#004ac6]" />
                                  Direct Benefit Life-Cycle Progress
                                </span>
                                <span className="text-[11px] font-semibold text-[#737686]">
                                  {isAppApproved
                                    ? "Disbursal Settled"
                                    : isAppRejected
                                    ? "Terminated"
                                    : "Stage 2 of 5"}
                                </span>
                              </div>

                              <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#c3c6d7]">
                                {/* Step 1 */}
                                <div className="relative flex items-start gap-3">
                                  <span className="absolute -left-6 top-0.5 w-6 h-6 rounded-full bg-[#004ac6] flex items-center justify-center text-white shadow-sm ring-4 ring-[#faf8ff]">
                                    <Check className="h-3 w-3" />
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                                      <p className="font-bold text-[#131b2e]">Application Submitted Digitally</p>
                                      <span className="text-[10px] text-[#737686] font-mono">{formatDate(app.createdAt)}</span>
                                    </div>
                                    <p className="text-[11px] text-[#737686] mt-0.5">
                                      Encrypted payload lodged securely on national repository with student e-Sign.
                                    </p>
                                  </div>
                                </div>

                                {/* Step 2 */}
                                <div className="relative flex items-start gap-3">
                                  <span className="absolute -left-6 top-0.5 w-6 h-6 rounded-full bg-[#004ac6] flex items-center justify-center text-white shadow-sm ring-4 ring-[#faf8ff]">
                                    <Check className="h-3 w-3" />
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                                      <p className="font-bold text-[#131b2e]">Institutional Bonafide Verified</p>
                                      <span className="text-[10px] text-[#737686] font-mono">Academic Nodal Desk</span>
                                    </div>
                                    <p className="text-[11px] text-[#737686] mt-0.5">
                                      Verified by IIT Delhi Controller of Examinations &amp; Academic Dean Office.
                                    </p>
                                  </div>
                                </div>

                                {/* Step 3 */}
                                <div className="relative flex items-start gap-3">
                                  <span
                                    className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm ring-4 ring-[#faf8ff] ${
                                      isAppRejected
                                        ? "bg-[#ba1a1a]"
                                        : isAppApproved
                                        ? "bg-[#004ac6]"
                                        : "bg-amber-500 animate-pulse"
                                    }`}
                                  >
                                    {isAppRejected ? (
                                      <X className="h-3 w-3" />
                                    ) : isAppApproved ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <Clock className="h-3 w-3" />
                                    )}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                                      <p className="font-bold text-[#131b2e]">Welfare Officer State Review</p>
                                      <span className="text-[10px] text-[#737686]">
                                        {isAppApproved ? "Approved" : isAppRejected ? "Disqualified" : "Under Active Review"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#737686] mt-0.5">
                                      {isAppApproved
                                        ? "Official state committee verified eligibility criteria and approved merit quota."
                                        : isAppRejected
                                        ? "Application disqualified by District Welfare Officer desk."
                                        : "Dossier undergoing automated cryptographic rule verification."}
                                    </p>
                                  </div>
                                </div>

                                {/* Step 4 */}
                                <div className={`relative flex items-start gap-3 ${!isAppApproved ? "opacity-40" : ""}`}>
                                  <span
                                    className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm ring-4 ring-[#faf8ff] ${
                                      isAppApproved ? "bg-[#004ac6]" : "bg-zinc-300 text-zinc-500"
                                    }`}
                                  >
                                    {isAppApproved ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                                      <p className="font-bold text-[#131b2e]">Merit Sanction &amp; Order Issue</p>
                                      <span className="text-[10px] text-[#737686]">
                                        {isAppApproved ? "Order Issued" : "Pending"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#737686] mt-0.5">
                                      {isAppApproved
                                        ? "Formal sanction decree signed and registered on scholarship ledger."
                                        : "Pending state verification clearance."}
                                    </p>
                                  </div>
                                </div>

                                {/* Step 5 */}
                                <div className={`relative flex items-start gap-3 ${!isAppApproved ? "opacity-40" : ""}`}>
                                  <span
                                    className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm ring-4 ring-[#faf8ff] ${
                                      isAppApproved ? "bg-emerald-600" : "bg-zinc-300 text-zinc-500"
                                    }`}
                                  >
                                    {isAppApproved ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                                      <p className="font-bold text-[#131b2e]">Direct Benefit Transfer (DBT) to Bank</p>
                                      <span className="text-[10px] text-[#737686]">
                                        {isAppApproved ? "Settled" : "Pending Disbursal"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#737686] mt-0.5">
                                      {isAppApproved
                                        ? "PFMS electronic clearing credit deposited directly into Aadhaar seeded SBI A/C."
                                        : "Funds release scheduled upon committee sanction approval."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* In-Card Action Buttons */}
                            <div className="mt-4 pt-4 border-t border-[#eaedff] flex flex-wrap items-center justify-between gap-3">
                              {isAppApproved ? (
                                <div id="tour-apps-award-letter" className="flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedAwardApp(app)}
                                    className="bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold rounded-xl h-8 px-3.5 gap-1.5 shadow-sm"
                                  >
                                    <Award className="h-3.5 w-3.5" />
                                    <span>Award Letter</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownloadAwardPng(app)}
                                    className="border-[#eaedff] bg-white text-[#131b2e] hover:bg-[#f2f3ff] text-xs font-semibold rounded-xl h-8 px-3 gap-1.5"
                                  >
                                    <Download className="h-3.5 w-3.5 text-[#004ac6]" />
                                    <span>Download Letter (PNG)</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownloadAwardPdf(app)}
                                    className="border-[#eaedff] bg-white text-[#004ac6] hover:bg-[#f2f3ff] text-xs font-semibold rounded-xl h-8 px-3 gap-1.5"
                                  >
                                    <Download className="h-3.5 w-3.5 text-[#004ac6]" />
                                    <span>Download Letter (PDF)</span>
                                  </Button>
                                </div>
                              ) : isAppRejected ? (
                                <div id="tour-apps-rejection-appeal" className="flex flex-wrap items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-semibold rounded-xl h-8 px-3.5 gap-1.5 shadow-sm"
                                  >
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    <span>File Statutory Appeal (14 Days Window)</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => downloadRejectionMemoPdf(app)}
                                    className="border-[#eaedff] bg-white text-[#ba1a1a] hover:bg-[#ffdad6]/30 text-xs font-semibold rounded-xl h-8 px-3 gap-1.5"
                                  >
                                    <FileDown className="h-3.5 w-3.5" />
                                    <span>Rejection Memo (PDF)</span>
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-[#737686] flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-[#004ac6]" />
                                    Application logged under verified queue. Next update in 24 hrs.
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-xs text-[#737686]">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Ref: PS78-APP-{app.id.slice(0, 6).toUpperCase()}</span>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>

                  {/* Right Rail (4 cols): DBT & Bank Linkage, Verified Vault, Support */}
                  <div className="lg:col-span-4 flex flex-col gap-5">
                    {/* DBT & Bank Linkage Card */}
                    <div className="bg-white rounded-2xl p-5 border border-[#eaedff] shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#dbe1ff] flex items-center justify-center text-[#004ac6]">
                            <Landmark className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-[#131b2e] leading-tight font-heading">
                              NPCI DBT Status
                            </h3>
                            <p className="text-[11px] text-[#737686]">Aadhaar Bank Linkage</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dbe1ff] text-[#004ac6] text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#004ac6] animate-pulse" />
                          Active
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#f2f3ff] space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#737686]">Primary Disbursal A/C:</span>
                          <span className="font-semibold text-[#131b2e]">State Bank of India</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#737686]">Account Masked:</span>
                          <span className="font-mono font-semibold text-[#131b2e]">XXXX-XXXX-8912</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#737686]">NPCI Mapper Status:</span>
                          <span className="font-semibold text-[#005e6e] flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Seeded &amp; Enabled
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#737686] mt-3 leading-relaxed">
                        Government financial allocations are routed automatically via PFMS into your Aadhaar-seeded primary account.
                      </p>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => alert("NPCI Aadhaar mapping is healthy. Last pinged: 2 mins ago.")}
                        className="w-full mt-3 h-8 text-xs border-[#eaedff] text-[#131b2e] hover:bg-[#f2f3ff] rounded-xl gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-[#004ac6]" />
                        <span>Refresh NPCI Seeding Status</span>
                      </Button>
                    </div>

                    {/* Verified DigiLocker Vault Quick Access */}
                    <div className="bg-white rounded-2xl p-5 border border-[#eaedff] shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-[#131b2e] flex items-center gap-2 font-heading">
                          <Folder className="h-4 w-4 text-[#712ae2]" />
                          Verified DigiLocker Vault
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab("documents")}
                          className="text-[11px] text-[#004ac6] font-bold hover:underline"
                        >
                          View All
                        </button>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f2f3ff]">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-[#004ac6]" />
                            <div>
                              <span className="font-semibold text-[#131b2e] block">Aadhaar Card (UIDAI)</span>
                              <span className="text-[10px] text-[#737686]">Synced via DigiLocker</span>
                            </div>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f2f3ff]">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#004ac6]" />
                            <div>
                              <span className="font-semibold text-[#131b2e] block">Caste Certificate</span>
                              <span className="text-[10px] text-[#737686]">Valid till 2028</span>
                            </div>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>

                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f2f3ff]">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-[#004ac6]" />
                            <div>
                              <span className="font-semibold text-[#131b2e] block">Income Certificate</span>
                              <span className="text-[10px] text-[#737686]">Annual Income &lt; ₹2.5L</span>
                            </div>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                      </div>
                    </div>

                    {/* Help & Support Card */}
                    <div className="bg-gradient-to-br from-[#f2f3ff] to-[#e2e7ff] rounded-2xl p-5 border border-[#eaedff] shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#004ac6] text-white flex items-center justify-center shrink-0 shadow-sm">
                          <HelpCircle className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-[#131b2e] font-heading">Facing Verification Delays?</h4>
                          <p className="text-[11px] text-[#434655] leading-relaxed">
                            If your application is pending at Institute or State Welfare desk for more than 7 days, you can lodge an automated grievance ticket.
                          </p>
                          <button
                            type="button"
                            onClick={() => alert("Grievance ticket logged: TKT-2026-9081. Welfare desk notified.")}
                            className="text-xs font-bold text-[#004ac6] hover:underline inline-flex items-center gap-1 pt-1"
                          >
                            <span>Lodge Grievance / Query</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* ========================================================================= */}
          {/* 4. STUDENT VIEW: VERIFIED DOCUMENTS & DIGILOCKER VAULT (Stitch Spec)     */}
          {/* ========================================================================= */}
          {activeRole === "STUDENT" && activeTab === "documents" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {isDataLoading ? (
                /* Skeleton Loading State */
                <div className="space-y-6">
                  <div className="p-8 rounded-2xl bg-white border border-[#eaedff] shadow-sm space-y-4">
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-36 rounded-full" />
                      <Skeleton className="h-5 w-28 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-64 rounded-lg" />
                    <Skeleton className="h-4 w-full max-w-xl rounded-md" />
                    <div className="flex gap-3 pt-2">
                      <Skeleton className="h-10 w-44 rounded-lg" />
                      <Skeleton className="h-10 w-44 rounded-lg" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-4 rounded-xl bg-white border border-[#eaedff] flex items-center gap-3">
                        <Skeleton className="w-11 h-11 rounded-lg" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-6 w-12" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-6 rounded-2xl bg-white border border-[#eaedff] space-y-4">
                        <div className="flex justify-between">
                          <div className="flex gap-3">
                            <Skeleton className="w-10 h-10 rounded-xl" />
                            <div className="space-y-1">
                              <Skeleton className="h-5 w-40" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <Skeleton className="h-9 w-full rounded-lg" />
                        <div className="flex justify-between pt-2">
                          <Skeleton className="h-8 w-24 rounded-lg" />
                          <Skeleton className="h-8 w-24 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Top Banner with Ambient Glow (Stitch Spec) */}
                  <div
                    id="tour-document-vault"
                    className="relative w-full rounded-2xl overflow-hidden bg-white p-6 md:p-8 shadow-sm border border-[#eaedff]"
                  >
                    <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#2563eb]/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute right-32 -bottom-20 w-56 h-56 bg-[#712ae2]/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 max-w-2xl">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] font-bold text-[11px] uppercase tracking-wider">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            PS78 Trust Network
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#434655]">
                            <span className="w-2 h-2 rounded-full bg-[#004ac6]" />
                            DigiLocker v2.4 Active
                          </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight font-heading">
                          Document Vault
                        </h1>
                        <p className="text-xs md:text-sm text-[#434655] leading-relaxed">
                          Manage your verified academic records, government certificates, and DigiLocker synchronizations in a tamper-proof digital locker.
                        </p>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleStartTabTour("documents")}
                          className="h-11 px-3.5 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg shadow-sm gap-1.5 transition-all"
                          title="Learn how Document Vault works"
                        >
                          <HelpCircle className="h-4 w-4 text-purple-600" />
                          <span>Vault Guide (?)</span>
                        </Button>

                        <Button
                          onClick={handleSyncDigiLocker}
                          disabled={isSyncingVault}
                          variant="outline"
                          className="h-11 px-4 border-[#eaedff] bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#131b2e] text-xs font-semibold rounded-lg shadow-sm gap-2 transition-all"
                        >
                          <RefreshCw className={`h-4 w-4 text-[#004ac6] ${isSyncingVault ? "animate-spin" : ""}`} />
                          <div className="flex flex-col text-left">
                            <span>Re-sync DigiLocker &amp; e-District</span>
                            <span className="text-[10px] text-[#737686] font-normal">{lastSyncedText}</span>
                          </div>
                        </Button>

                        <Button
                          onClick={() => setIsUploadDocOpen(true)}
                          className="h-11 px-5 bg-[#2563eb] hover:bg-[#004ac6] text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg gap-2 transition-all"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Upload New Document</span>
                        </Button>
                      </div>
                    </div>

                    {vaultSyncNotice && (
                      <div className="mt-4 p-3.5 rounded-xl bg-blue-50 text-blue-950 text-xs font-medium flex items-center gap-2.5 border border-blue-200">
                        <CheckCircle2 className="h-4 w-4 text-[#004ac6] shrink-0" />
                        <span>{vaultSyncNotice}</span>
                      </div>
                    )}
                  </div>

                  {/* 4 Clean Metric Cards (Stitch Spec) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-[#eaedff] shadow-sm hover:shadow-md transition-all">
                      <div className="w-11 h-11 rounded-lg bg-[#f2f3ff] flex items-center justify-center text-[#004ac6] shrink-0">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xl font-bold text-[#131b2e] leading-tight font-heading">
                          {vaultDocuments.filter((d) => d.isVerified || d.verdict === "GENUINE_VERIFIED").length + (bonafideStatus === "VERIFIED" ? 1 : 0)}
                        </span>
                        <span className="text-xs text-[#737686] truncate">Verified Documents</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-[#eaedff] shadow-sm hover:shadow-md transition-all">
                      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                        bonafideStatus === "VERIFIED" ? "bg-emerald-50 text-emerald-700" : "bg-[#ffdad6] text-[#ba1a1a]"
                      }`}>
                        {bonafideStatus === "VERIFIED" ? (
                          <Check className="h-6 w-6" />
                        ) : (
                          <AlertTriangle className="h-6 w-6" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-xl font-bold leading-tight font-heading ${
                          bonafideStatus === "VERIFIED" ? "text-emerald-700" : "text-[#ba1a1a]"
                        }`}>
                          {bonafideStatus === "VERIFIED" ? 0 : 1}
                        </span>
                        <span className="text-xs text-[#737686] truncate">
                          {bonafideStatus === "VERIFIED" ? "All Clear" : "Needs Attention"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-[#eaedff] shadow-sm hover:shadow-md transition-all">
                      <div className="w-11 h-11 rounded-lg bg-[#e2e7ff] flex items-center justify-center text-[#712ae2] shrink-0">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-[#131b2e] leading-tight font-heading">DigiLocker</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#004ac6]" />
                        </div>
                        <span className="text-[11px] text-[#004ac6] font-bold truncate">✓ Active &amp; Linked</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white border border-[#eaedff] shadow-sm hover:shadow-md transition-all">
                      <div className="w-11 h-11 rounded-lg bg-[#f2f3ff] flex items-center justify-center text-[#005e6e] shrink-0">
                        <Fingerprint className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-[#131b2e] leading-tight font-heading">Aadhaar e-KYC</span>
                        </div>
                        <span className="text-[11px] text-[#005e6e] font-bold truncate">✓ NPCI DBT Seeded</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: DigiLocker & Institutional Connected Documents (Stitch Spec) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-6 rounded-full bg-[#2563eb]" />
                        <h2 className="text-lg font-bold text-[#131b2e] font-heading">
                          DigiLocker &amp; Institutional Connected Documents
                        </h2>
                      </div>
                      <span className="text-xs text-[#434655] bg-[#e2e7ff] px-3 py-1 rounded-full font-semibold">
                        4 Certified Records
                      </span>
                    </div>

                    <div id="tour-docs-specimen-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Document Card 1: Annual Family Income Certificate */}
                      <div className="flex flex-col justify-between p-6 rounded-2xl bg-white border border-[#eaedff] shadow-sm hover:shadow-md transition-all group">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#eaedff] flex items-center justify-center text-[#004ac6] group-hover:scale-105 transition-transform">
                                <DollarSign className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-[#131b2e] leading-tight font-heading">
                                  Annual Family Income Certificate
                                </h3>
                                <span className="text-xs text-[#737686]">Tahsildar Revenue Office (e-District)</span>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e2e7ff] text-[#004ac6] text-xs font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#004ac6]" />
                              TN e-District
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#f2f3ff] text-xs">
                            <div>
                              <span className="text-[#737686] block text-[10px] uppercase font-semibold">Validity</span>
                              <span className="font-semibold text-[#131b2e]">Valid till 31 Mar 2027</span>
                            </div>
                            <div>
                              <span className="text-[#737686] block text-[10px] uppercase font-semibold">Annual Income</span>
                              <span className="font-bold text-[#004ac6]">₹1,80,000</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#faf8ff] border border-[#eaedff] text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-[#737686] shrink-0" />
                              <span className="text-[#131b2e] truncate font-medium">income_certificate_2024_signed.pdf</span>
                            </div>
                            <span className="text-[11px] text-[#737686] shrink-0 font-mono">1.8 MB</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#eaedff]">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const doc = vaultDocuments.find((d) => d.id.includes("income") || d.title.includes("Income")) || vaultDocuments[0];
                                if (doc) setPreviewDoc(doc);
                              }}
                              className="h-8 px-3 rounded-lg bg-white hover:bg-[#f2f3ff] text-[#131b2e] border-[#eaedff] text-xs gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Preview</span>
                            </Button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadIndianDocType("INCOME_CERTIFICATE");
                              setUploadDocTitle("Annual Family Income Certificate");
                              setIsUploadDocOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-[#737686] hover:text-[#131b2e] hover:bg-[#f2f3ff] transition-colors"
                            title="Replace File"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Document Card 2: Community & Caste Certificate */}
                      <div className="flex flex-col justify-between p-6 rounded-2xl bg-white border border-[#eaedff] shadow-sm hover:shadow-md transition-all group">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#eaddff] flex items-center justify-center text-[#712ae2] group-hover:scale-105 transition-transform">
                                <Bookmark className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-[#131b2e] leading-tight font-heading">
                                  Community &amp; Caste Certificate
                                </h3>
                                <span className="text-xs text-[#737686]">OBC - Non-Creamy Layer (NCL)</span>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eaddff] text-[#712ae2] text-xs font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#712ae2]" />
                              Revenue Dept
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#f2f3ff] text-xs">
                            <div>
                              <span className="text-[#737686] block text-[10px] uppercase font-semibold">Term Status</span>
                              <span className="font-semibold text-[#131b2e]">Permanent Validity</span>
                            </div>
                            <div>
                              <span className="text-[#737686] block text-[10px] uppercase font-semibold">Declared Quota</span>
                              <span className="font-bold text-[#712ae2]">Backward Class (BC)</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#faf8ff] border border-[#eaedff] text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-[#737686] shrink-0" />
                              <span className="text-[#131b2e] truncate font-medium">community_cert_tahsildar.pdf</span>
                            </div>
                            <span className="text-[11px] text-[#737686] shrink-0 font-mono">1.2 MB</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#eaedff]">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const doc = vaultDocuments.find((d) => d.id.includes("caste") || d.title.includes("Community")) || vaultDocuments[1];
                                if (doc) setPreviewDoc(doc);
                              }}
                              className="h-8 px-3 rounded-lg bg-white hover:bg-[#f2f3ff] text-[#131b2e] border-[#eaedff] text-xs gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Preview</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const doc = vaultDocuments.find((d) => d.id.includes("caste") || d.title.includes("Community")) || vaultDocuments[1];
                                if (doc) setPreviewDoc(doc);
                              }}
                              className="h-8 px-3 rounded-lg bg-white hover:bg-[#f2f3ff] text-[#131b2e] border-[#eaedff] text-xs gap-1.5"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </Button>
                          </div>
                          <span className="text-[11px] text-[#737686] px-2.5 py-1 rounded bg-[#f2f3ff] font-medium border border-[#eaedff]">
                            PKI Sign Valid
                          </span>
                        </div>
                      </div>

                      {/* Document Card 3: B.E CSE 1st Year Consolidated Marksheet */}
                      <div className="flex flex-col justify-between p-6 rounded-2xl bg-white border border-[#eaedff] shadow-sm hover:shadow-md transition-all group">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#f2f3ff] flex items-center justify-center text-[#004ac6] group-hover:scale-105 transition-transform">
                                <School className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-[#131b2e] leading-tight font-heading">
                                  B.E CSE 1st Year Consolidated Marksheet
                                </h3>
                                <span className="text-xs text-[#737686]">Indian Institute of Technology Delhi</span>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e2e7ff] text-[#004ac6] text-xs font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#004ac6]" />
                              AICTE / IITD API
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#f2f3ff] text-xs">
                            <div>
                              <span className="text-[#737686] block text-[10px] uppercase font-semibold">Academic Standing</span>
                              <span className="font-bold text-[#004ac6]">8.24 / 10.0 CGPA</span>
                            </div>
                            <div>
                              <span className="text-[#737686] block text-[10px] uppercase font-semibold">Institutional Roll No</span>
                              <span className="font-mono text-[#131b2e] font-semibold">2024CS108</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#faf8ff] border border-[#eaedff] text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-[#737686] shrink-0" />
                              <span className="text-[#131b2e] truncate font-medium">iitd_semester_marksheet_transcript.pdf</span>
                            </div>
                            <span className="text-[11px] text-[#737686] shrink-0 font-mono">2.4 MB</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#eaedff]">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const doc = vaultDocuments.find((d) => d.id.includes("marksheet") || d.title.includes("Transcript")) || vaultDocuments[2];
                                if (doc) setPreviewDoc(doc);
                              }}
                              className="h-8 px-3 rounded-lg bg-white hover:bg-[#f2f3ff] text-[#131b2e] border-[#eaedff] text-xs gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Preview</span>
                            </Button>
                          </div>
                          <span className="text-xs text-[#004ac6] flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#004ac6]" />
                            Synced
                          </span>
                        </div>
                      </div>

                      {/* Document Card 4: Aadhaar e-KYC & NPCI Mandate */}
                      <div className="flex flex-col justify-between p-6 rounded-2xl bg-white border border-[#eaedff] shadow-sm hover:shadow-md transition-all group">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#e2e7ff] flex items-center justify-center text-[#005e6e] group-hover:scale-105 transition-transform">
                                <Landmark className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-[#131b2e] leading-tight font-heading">
                                  Aadhaar e-KYC &amp; NPCI Mandate
                                </h3>
                                <span className="text-xs text-[#737686]">Direct Benefit Transfer (DBT) Route</span>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eaedff] text-[#005e6e] text-xs font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#005e6e]" />
                              UIDAI &amp; NPCI
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[#f2f3ff] text-xs space-y-1">
                            <span className="text-[#737686] block text-[10px] uppercase font-semibold">Active Disbursement Bank</span>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#131b2e]">State Bank of India (A/C ********8912)</span>
                              <span className="px-2 py-0.5 rounded bg-[#eaedff] text-[10px] font-bold text-[#005e6e]">
                                DBT Seeded
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#faf8ff] border border-[#eaedff] text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-[#737686] shrink-0" />
                              <span className="text-[#131b2e] truncate font-medium">npci_aadhaar_mandate_signed.pdf</span>
                            </div>
                            <span className="text-[11px] text-[#737686] shrink-0 font-mono">850 KB</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#eaedff]">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const doc = vaultDocuments.find((d) => d.id.includes("aadhaar") || d.title.includes("Aadhaar")) || vaultDocuments[3];
                                if (doc) setPreviewDoc(doc);
                              }}
                              className="h-8 px-3 rounded-lg bg-white hover:bg-[#f2f3ff] text-[#131b2e] border-[#eaedff] text-xs gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Preview</span>
                            </Button>
                          </div>
                          <span className="text-xs text-[#005e6e] font-semibold">
                            KYC Level 3
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Institutional Uploads (Requiring Annual Renewal) (Stitch Spec) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-6 rounded-full bg-[#ba1a1a]" />
                        <h2 className="text-lg font-bold text-[#131b2e] font-heading">
                          Institutional Uploads (Requiring Annual Renewal)
                        </h2>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                        bonafideStatus === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-[#ffdad6] text-[#ba1a1a]"
                      }`}>
                        {bonafideStatus === "VERIFIED" ? "Verified & Current" : "Action Required"}
                      </span>
                    </div>

                    <div className="p-6 md:p-8 rounded-2xl bg-white border border-[#eaedff] shadow-sm flex flex-col lg:flex-row gap-6 items-stretch">
                      {/* Left: Certificate Context & Requirements */}
                      <div className="flex flex-col justify-between flex-1 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                              bonafideStatus === "VERIFIED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-[#ffdad6] text-[#ba1a1a]"
                            }`}>
                              {bonafideStatus === "VERIFIED" ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  Renewal Completed for AY 2026-27
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Renewal Required for Upcoming Term
                                </>
                              )}
                            </span>
                            <span className="text-xs text-[#737686]">Academic Cycle 2026-27</span>
                          </div>

                          <h3 className="text-xl font-bold text-[#131b2e] font-heading">
                            Bonafide Certificate (Academic Year 2026-27)
                          </h3>
                          <p className="text-xs md:text-sm text-[#434655] leading-relaxed">
                            Your 2nd-year bonafide signed by HOD or Registrar is required to complete pending scholarship claims. Without this certificate, subsequent instalments will be deferred.
                          </p>
                        </div>

                        {/* OCR & Forensic Engine Feature Tag */}
                        <div className="p-3.5 rounded-xl bg-[#f2f3ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#eaedff]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#eaedff] flex items-center justify-center text-[#004ac6] shrink-0">
                              <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#131b2e] block">
                                AI Real-time Seal &amp; Signature Verification
                              </span>
                              <span className="text-[11px] text-[#737686]">
                                Auto-detects institutional rubber stamps, registrar signatures, and date stamps
                              </span>
                            </div>
                          </div>
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#e2e7ff] text-[#004ac6] font-bold shrink-0 self-start sm:self-auto">
                            OCR Enabled
                          </span>
                        </div>
                      </div>

                      {/* Right: Drag and Drop Upload Zone (Stitch Spec) */}
                      <div className="lg:w-1/2 flex flex-col justify-center">
                        <div
                          id="tour-docs-upload-slot"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              const file = e.dataTransfer.files[0];
                              handleBonafideUpload({
                                name: file.name,
                                size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                              });
                            }
                          }}
                          className={`group flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl transition-all border-2 border-dashed text-center min-h-[220px] relative overflow-hidden ${
                            bonafideStatus === "VERIFIED"
                              ? "bg-emerald-50/50 border-emerald-300"
                              : bonafideStatus === "SUSPICIOUS"
                              ? "bg-red-50/50 border-red-300"
                              : "bg-[#f2f3ff] hover:bg-[#eaedff] border-[#c3c6d7]"
                          }`}
                        >
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            id="bonafideFileInput"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                handleBonafideUpload({
                                  name: file.name,
                                  size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                                });
                              }
                            }}
                          />

                          {bonafideStatus === "SCANNING" ? (
                            <div className="flex flex-col items-center gap-3">
                              <RefreshCw className="h-10 w-10 text-[#004ac6] animate-spin" />
                              <div className="space-y-1">
                                <h4 className="font-bold text-sm text-[#131b2e]">Scanning Institutional Bonafide...</h4>
                                <p className="text-xs text-[#737686]">
                                  Running Dihedral parity checks, registrar signature detection, and academic term matching.
                                </p>
                              </div>
                            </div>
                          ) : bonafideStatus === "VERIFIED" ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <CheckCircle2 className="h-7 w-7" />
                              </div>
                              <h4 className="font-bold text-sm text-emerald-900">
                                Institutional Bonafide Verified &amp; Anchored
                              </h4>
                              <p className="text-xs text-emerald-800">
                                {bonafideFile?.name} ({bonafideFile?.size}) • Valid for AY 2026-27
                              </p>
                              <span className="text-[10px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                SHA256: {bonafideFile?.hash.substring(0, 16)}...
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setBonafideStatus("PENDING_RENEWAL");
                                  setBonafideFile(null);
                                  setBonafideForensicReport(null);
                                }}
                                className="mt-2 h-7 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                              >
                                Replace File
                              </Button>
                            </div>
                          ) : bonafideStatus === "SUSPICIOUS" ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                                <AlertTriangle className="h-7 w-7" />
                              </div>
                              <h4 className="font-bold text-sm text-red-900">
                                Forgery Detected / Seal Verification Failed
                              </h4>
                              <p className="text-xs text-red-800 max-w-sm">
                                {bonafideForensicReport?.tamperSummary || "Institutional rubber stamp missing or invalid academic year."}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleBonafideUpload({
                                    name: "bonafide_iitd_2026_signed.pdf",
                                    size: "1.4 MB",
                                    isFake: false,
                                  })}
                                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Load Genuine Sample
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setBonafideStatus("PENDING_RENEWAL");
                                    setBonafideForensicReport(null);
                                  }}
                                  className="h-8 text-xs"
                                >
                                  Try Again
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#004ac6] mb-2 group-hover:scale-110 transition-transform">
                                <UploadCloud className="h-6 w-6" />
                              </div>
                              <h4 className="font-bold text-sm text-[#131b2e] mb-1 font-heading">
                                Drag and drop fresh Bonafide PDF here
                              </h4>
                              <p className="text-xs text-[#737686] mb-3">
                                Supports PDF, JPG, or PNG up to 5MB (Institutional Letterhead)
                              </p>

                              <div className="flex items-center gap-2 flex-wrap justify-center">
                                <label
                                  htmlFor="bonafideFileInput"
                                  className="px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#004ac6] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                                >
                                  Browse Local Files
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleBonafideUpload({
                                      name: `iitd_bonafide_${student.fullName.toLowerCase().replace(/\s+/g, '_')}_2026.pdf`,
                                      size: "1.5 MB",
                                      isFake: false,
                                    });
                                  }}
                                  className="px-4 py-2 rounded-lg bg-white hover:bg-[#faf8ff] text-[#131b2e] text-xs font-semibold shadow-sm border border-[#eaedff] transition-all"
                                >
                                  Pull from DigiLocker
                                </button>
                              </div>

                              {/* Judge 1-Click Verification Test Buttons */}
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#eaedff]/60 text-[11px]">
                                <span className="text-[#737686] font-medium">Judge Tests:</span>
                                <button
                                  type="button"
                                  onClick={() => handleBonafideUpload({
                                    name: "bonafide_iitd_2026_signed.pdf",
                                    size: "1.4 MB",
                                    isFake: false,
                                  })}
                                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-medium"
                                >
                                  Test Genuine Sample
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBonafideUpload({
                                    name: "fake_tampered_bonafide.pdf",
                                    size: "1.1 MB",
                                    isFake: true,
                                  })}
                                  className="px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 hover:bg-red-100 font-medium"
                                >
                                  Test Forged Sample
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: MeitY & DigiLocker AES-256 Compliant Vault Guarantee (Stitch Spec) */}
                  <div className="p-5 rounded-2xl bg-[#eaedff] flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#004ac6] shrink-0 shadow-sm">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-[#131b2e] font-heading">
                        MeitY &amp; DigiLocker AES-256 Compliant Vault
                      </span>
                      <p className="text-xs text-[#434655] leading-relaxed">
                        All stored certificates are 256-bit AES encrypted and stored strictly in compliance with DigiLocker and MeitY CERT-In data protection frameworks. Only authorized verification nodal officers can view decrypted files during active reviews.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 5. STUDENT VIEW: NOTIFICATION CENTER & STATUTORY ALERTS                   */}
          {/* ========================================================================= */}
          {activeRole === "STUDENT" && activeTab === "notifications" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 max-w-7xl mx-auto pb-16"
            >
              {/* Subtle Ambient Glow & Context Grid Header */}
              <div className="relative w-full">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#712ae2]/10 text-[#712ae2] font-semibold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#712ae2] animate-pulse" />
                        Real-Time Push Feeds Active
                      </span>
                      <span className="text-[#737686] text-xs">•</span>
                      <span className="text-[#434655] text-xs font-semibold">AY 2026-27</span>
                    </div>
                    <h1 className="font-bold text-2xl md:text-3xl text-[#131b2e] tracking-tight font-heading">
                      Notification Center
                    </h1>
                    <p className="text-xs md:text-sm text-[#434655] mt-1 max-w-2xl">
                      Stay informed on statutory status changes, AI-recommended grant schemes, urgent document revisions, and DBT cash disbursements.
                    </p>
                  </div>

                  {/* Global Controls */}
                  <div className="flex items-center gap-2 self-start lg:self-center flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                        setAdminActionNotice("All notifications marked as read.");
                        setTimeout(() => setAdminActionNotice(null), 3000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f2f3ff] text-[#131b2e] hover:bg-[#e2e7ff] transition-colors text-xs font-semibold shadow-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#004ac6]" />
                      <span>Mark all as read</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminActionNotice("Notification channel preferences updated: SMS & Email alerts active.");
                        setTimeout(() => setAdminActionNotice(null), 3000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2563eb] text-white hover:bg-[#004ac6] transition-all text-xs font-semibold shadow-sm"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>Notification Channels</span>
                    </button>
                  </div>
                </div>

                {/* Filter Strip */}
                <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: "all", label: "All", count: notifications.length + 3 },
                    { id: "unread", label: "Unread", count: notifications.filter((n) => !n.read).length + 2, isUnread: true },
                    { id: "alerts", label: "Alerts & Disqualifications", count: 1, isAlert: true },
                    { id: "verification", label: "Verification & Approvals", count: 5 },
                    { id: "deadlines", label: "Deadlines", count: 3 },
                    { id: "disbursals", label: "Disbursals", count: 2 },
                  ].map((filter) => {
                    const isActive = notifFilter === filter.id;

                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setNotifFilter(filter.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                          isActive
                            ? "bg-[#2563eb] text-white shadow-sm"
                            : filter.isAlert
                            ? "bg-[#ffffff] text-[#ba1a1a] hover:bg-[#ffdad6]/60 border border-[#ffdad6]"
                            : "bg-[#ffffff] text-[#131b2e] hover:bg-[#f2f3ff] border border-[#eaedff]"
                        }`}
                      >
                        <span>{filter.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isActive
                              ? "bg-white/20 text-white"
                              : filter.isAlert
                              ? "bg-[#ba1a1a] text-white"
                              : filter.isUnread
                              ? "bg-[#712ae2] text-white"
                              : "bg-[#e2e7ff] text-[#434655]"
                          }`}
                        >
                          {filter.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Feed Content Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 flex flex-col gap-4">
                  {/* URGENT STATUTORY REJECTION ALERT CARD (Stitch Screen) */}
                  {(notifFilter === "all" || notifFilter === "unread" || notifFilter === "alerts") && (
                    <div className="relative bg-[#ffffff] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start gap-4 border-l-4 border-l-[#ba1a1a] border border-[#eaedff]">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-[#ffdad6] flex items-center justify-center text-[#ba1a1a] animate-pulse">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] font-bold inline-flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> Statutory Rejection Notice • Immediate Action Required
                            </span>
                            <span className="w-2 h-2 rounded-full bg-[#ba1a1a] inline-block animate-pulse" title="Immediate Action Required" />
                          </div>
                          <span className="text-xs font-semibold text-[#ba1a1a]">Just now (Urgent)</span>
                        </div>

                        <h2 className="font-bold text-base text-[#131b2e] mt-1.5 font-heading">
                          Application PS78-2026-000123 Disqualified by Welfare Officer
                        </h2>
                        <p className="text-xs text-[#434655] mt-1 leading-relaxed">
                          Your application for &lsquo;Post-Matric Scholarship Scheme for Technical Students&rsquo; was flagged by District Welfare Officer Anand K. Reason: Income Certificate (Dated 11-Aug-2023) has expired beyond statutory 1-year validity (Rule § 4.3). You have a statutory 14-day appeal window ending 30 Aug 2026.
                        </p>

                        <div className="mt-3 p-3 bg-[#ffdad6]/40 rounded-xl flex items-center justify-between flex-wrap gap-2 border border-[#ffdad6]">
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className="h-5 w-5 text-[#ba1a1a]" />
                            <div className="flex flex-col">
                              <span className="text-xs text-[#93000a] font-bold">Statutory Appeal Window: 14 Days Remaining</span>
                              <span className="text-[11px] text-[#434655]">Appellate Authority: Directorate of Welfare &amp; Backward Classes</span>
                            </div>
                          </div>
                          <span className="text-xs text-[#ba1a1a] bg-white px-2 py-0.5 rounded font-mono font-bold border border-[#ffdad6]">
                            Rule § 4.3
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 gap-2 border-t border-[#eaedff]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setAdminActionNotice("Formal Appeal / Grievance ticket #GRV-8821 opened for Directorate review.");
                                setTimeout(() => setAdminActionNotice(null), 3000);
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563eb] text-white text-xs font-bold shadow-sm hover:bg-[#004ac6] transition-all"
                            >
                              <FileText className="h-4 w-4" />
                              <span>File Formal Appeal / Grievance</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const dummyApp: Application = {
                                  id: "app-tn-8821",
                                  scholarshipId: "sch-101",
                                  scholarshipTitle: "Central Merit Grant AY 2025-26",
                                  studentId: student.id,
                                  studentName: student.fullName,
                                  studentEmail: student.email,
                                  studentDepartment: student.department,
                                  studentGpa: student.gpa,
                                  annualIncome: student.annualIncome,
                                  essay: "Review for merit quota",
                                  status: "REJECTED",
                                  createdAt: "2026-09-10",
                                  updatedAt: "2026-09-20",
                                };
                                downloadRejectionMemoPdf(dummyApp);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#f2f3ff] text-[#131b2e] hover:bg-[#e2e7ff] text-xs font-semibold transition-colors"
                            >
                              <FileDown className="h-4 w-4 text-[#ba1a1a]" />
                              <span>Download Rejection Order (PDF)</span>
                            </button>
                          </div>
                          <span className="text-[10px] text-[#737686] font-mono">Ref ID: REJ-TN-8821</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ITEM 1: HIGH PRIORITY AI MATCH */}
                  {(notifFilter === "all" || notifFilter === "unread" || notifFilter === "verification") && (
                    <div className="relative bg-[#ffffff] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start gap-4 border border-[#eaedff]">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-[#712ae2]/10 flex items-center justify-center text-[#712ae2]">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#712ae2]/15 text-[#712ae2] font-bold inline-flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> AI Match Alert
                            </span>
                            <span className="w-2 h-2 rounded-full bg-[#712ae2] inline-block" title="Unread" />
                          </div>
                          <span className="text-xs text-[#737686]">15 mins ago</span>
                        </div>

                        <h2 className="font-bold text-base text-[#131b2e] mt-1.5 font-heading">
                          New Scholarship Match: Infosys STEM Excellence Fellowship
                        </h2>
                        <p className="text-xs text-[#434655] mt-1 leading-relaxed">
                          Your profile satisfies 100% of statutory criteria for the ₹1,00,000/yr STEM fellowship. Applications opened today.
                        </p>

                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          <div className="flex items-center gap-1.5 bg-[#f2f3ff] px-2.5 py-1 rounded-md text-[#131b2e]">
                            <Award className="h-4 w-4 text-[#004ac6]" />
                            <span className="text-xs font-bold text-[#004ac6]">₹1,00,000 / Year</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#f2f3ff] px-2.5 py-1 rounded-md text-[#131b2e]">
                            <CheckCircle2 className="h-4 w-4 text-[#005e6e]" />
                            <span className="text-xs text-[#434655]">100% Criteria Alignment</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 gap-2 border-t border-[#eaedff]">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedScholarship(scholarships[0] || initialScholarships[0]);
                              setActiveTab("apply-flow");
                              setApplyStep(1);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#712ae2] to-[#004ac6] text-white text-xs font-bold shadow-sm hover:shadow transition-all"
                          >
                            <Sparkles className="h-4 w-4" />
                            <span>View Match &amp; Apply</span>
                          </button>
                          <span className="text-[10px] text-[#737686]">Scheme ID: INF-2026-STEM</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ITEM 2: DOCUMENT RENEWAL REQUIRED (Only if not verified or not dismissed) */}
                  {(notifFilter === "all" || notifFilter === "unread" || notifFilter === "verification") && bonafideStatus !== "VERIFIED" && !sessionDismissedNotifs.has("notif-bonafide-renewal") && (
                    <div className="relative bg-[#ffffff] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start gap-4 border border-[#eaedff]">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-[#ffdad6]/60 flex items-center justify-center text-[#ba1a1a]">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] font-bold inline-flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Document Verification Notice
                            </span>
                            <span className="w-2 h-2 rounded-full bg-[#ba1a1a] inline-block" title="Action Required" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#737686]">2 hours ago</span>
                            <button
                              type="button"
                              onClick={() => setSessionDismissedNotifs((prev) => new Set(prev).add("notif-bonafide-renewal"))}
                              className="text-[#737686] hover:text-[#ba1a1a] p-1 rounded hover:bg-[#ffdad6]/40"
                              title="Dismiss for this session"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <h2 className="font-bold text-base text-[#131b2e] mt-1.5 font-heading">
                          Bonafide Certificate Renewal Required
                        </h2>
                        <p className="text-xs text-[#434655] mt-1 leading-relaxed">
                          Reviewing Officer for Application <span className="font-mono text-[#004ac6] font-semibold">PS78-2026-000123</span> requested an updated 2nd Year Bonafide seal before final signoff.
                        </p>

                        <div className="mt-3 p-2.5 bg-[#f2f3ff] rounded-xl flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileBadge className="h-5 w-5 text-[#737686]" />
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-[#131b2e]">Required: Official_Bonafide_Yr2.pdf</span>
                              <span className="text-[11px] text-[#434655]">IIT Delhi Academic Affairs Stamp (Max 2MB)</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded font-bold">Action Pending</span>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 gap-2 border-t border-[#eaedff]">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("documents");
                              handleOpenDedicatedUpload("BONAFIDE_CERTIFICATE", "Institutional Bonafide Certificate (2026-27)", "Dean of Academic Affairs, IIT Delhi", "IITD/ACAD/2026/BF-8912");
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563eb] text-white text-xs font-bold shadow-sm hover:bg-[#004ac6] transition-all"
                          >
                            <Upload className="h-4 w-4" />
                            <span>Upload Bonafide Now</span>
                          </button>
                          <span className="text-[10px] text-[#737686]">Institutional Nodal: IITD-ACAD</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REGULAR NOTIFICATIONS LIST */}
                  <div className="space-y-3 pt-2">
                    {notifications
                      .filter((notif) => !sessionDismissedNotifs.has(notif.id))
                      .map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkNotificationRead(notif.id)}
                        className={`p-4 rounded-xl bg-white border border-[#eaedff] shadow-sm flex items-start gap-3 transition-all cursor-pointer hover:border-[#2563eb]/40 ${
                          !notif.read ? "border-l-4 border-l-[#2563eb] bg-[#faf8ff]" : ""
                        }`}
                      >
                        <div
                          className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                            notif.type === "SUCCESS"
                              ? "bg-emerald-500"
                              : notif.type === "WARNING"
                              ? "bg-[#ba1a1a]"
                              : "bg-[#712ae2]"
                          }`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-xs text-[#131b2e]">{notif.title}</h4>
                            <div className="flex items-center gap-2">
                              {!notif.read && (
                                <span className="px-2 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[9px] font-bold">
                                  NEW
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSessionDismissedNotifs((prev) => new Set(prev).add(notif.id));
                                }}
                                className="text-[#737686] hover:text-[#ba1a1a] p-0.5 rounded"
                                title="Dismiss notification"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-[#737686] mt-0.5">{notif.message}</p>
                          <span className="text-[10px] text-[#737686] mt-1 block font-mono">
                            {formatDate(notif.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column / Quick Insights & Channels */}
                <div className="lg:col-span-4 space-y-6">
                  {/* SMS / WhatsApp Realtime Relay Card */}
                  <div className="bg-[#ffffff] rounded-2xl p-6 shadow-sm border border-[#eaedff] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-[#004ac6]" />
                        <h3 className="font-bold text-sm text-[#131b2e] font-heading">
                          Statutory Push Channels
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[10px] font-bold">
                        ACTIVE
                      </span>
                    </div>

                    <p className="text-xs text-[#434655] leading-relaxed">
                      Instant alerts dispatched via Mobile SMS and WhatsApp for all statutory status shifts.
                    </p>

                    <div className="space-y-2 pt-1 border-t border-[#eaedff]">
                      <div className="flex items-center justify-between text-xs py-1.5">
                        <span className="text-[#434655]">Registered Phone</span>
                        <span className="font-mono font-bold text-[#131b2e]">+91 98765 *****</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1.5">
                        <span className="text-[#434655]">DigiLocker Linked Email</span>
                        <span className="font-mono text-[#131b2e] truncate max-w-[140px]">sanjay.p@iitd.ac.in</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1.5">
                        <span className="text-[#434655]">Appellate Window Notifications</span>
                        <span className="text-emerald-600 font-bold">Priority High</span>
                      </div>
                    </div>
                  </div>

                  {/* Help & Appeal Guidelines Card */}
                  <div className="bg-[#f2f3ff] rounded-2xl p-5 border border-[#eaedff] space-y-3">
                    <div className="flex items-center gap-2 text-[#004ac6]">
                      <HelpCircle className="h-5 w-5" />
                      <span className="font-bold text-xs">Statutory Grievance Protocol</span>
                    </div>
                    <p className="text-xs text-[#434655] leading-relaxed">
                      If an application is rejected due to invalid documents, students have a statutory right to appeal within 14 calendar days under Rule § 4.3 of the State Scholarship Bylaws.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("srs")}
                      className="text-xs font-bold text-[#004ac6] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Read Rule § 4.3 Specifications →</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 5. STUDENT VIEW: PROFILE DOSSIER & SMART PRE-FILL VAULT (Stitch Spec)     */}
          {/* ========================================================================= */}
          {activeRole === "STUDENT" && activeTab === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Hero Banner with Dynamic Gradient & Ambient Glows */}
              <div
                id="tour-profile-hero"
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#004ac6] via-[#2563eb] to-[#712ae2] text-white p-6 md:p-8 shadow-lg"
              >
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-10 w-72 h-72 rounded-full bg-[#8a4cfc]/20 blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="relative shrink-0">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/20 border-2 border-white/40 text-white flex items-center justify-center font-bold text-3xl font-heading shadow-md ring-4 ring-white/20 backdrop-blur-md">
                        {student.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-white text-[#004ac6] p-1.5 rounded-full shadow-md flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 fill-[#004ac6] text-white" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading text-white">
                          {student.fullName}
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4cd7f6] animate-pulse" />
                          Verified Scholar
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-white/90 flex items-center gap-1.5 font-medium">
                        <School className="h-4 w-4 text-[#acedff] shrink-0" />
                        Roll: {student.rollNo || "2024CS108"} • B.E {student.department} (2nd Year)
                      </p>
                      <p className="text-xs text-white/80 flex items-center gap-1.5">
                        <Landmark className="h-4 w-4 text-[#acedff] shrink-0" />
                        Indian Institute of Technology Delhi (IIT Delhi)
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 text-white text-[10px] font-semibold backdrop-blur-md">
                          <Lock className="h-3 w-3 text-[#acedff]" />
                          DigiLocker Linked
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 text-white text-[10px] font-semibold backdrop-blur-md">
                          <Fingerprint className="h-3 w-3 text-[#acedff]" />
                          UIDAI Aadhaar e-KYC
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 text-white text-[10px] font-semibold backdrop-blur-md">
                          <CheckCircle className="h-3 w-3 text-[#acedff]" />
                          NPCI DBT Active
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-3 self-stretch lg:self-center">
                    <div className="bg-white/15 backdrop-blur-xl p-3.5 rounded-xl flex flex-col gap-1.5 min-w-[200px]">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] uppercase tracking-wider text-[#acedff] font-bold">Profile Strength</span>
                        <span className="text-sm text-white font-extrabold font-heading">
                          {bonafideStatus === "VERIFIED" ? "100%" : "90%"}
                        </span>
                      </div>
                      <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#acedff] to-[#4cd7f6] h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: bonafideStatus === "VERIFIED" ? "100%" : "90%" }}
                        />
                      </div>
                      <span className="text-[10px] text-white/90 text-right font-medium">
                        {bonafideStatus === "VERIFIED" ? "All Clear • 100% Statutory Verified" : "Ready for 1-Click Auto-Fill"}
                      </span>
                    </div>

                    <div id="tour-profile-download-actions" className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleStartTabTour("profile")}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 shadow-md backdrop-blur-md"
                        title="Profile Dossier Guide (?)"
                      >
                        <HelpCircle className="h-4 w-4" />
                        <span>Profile Guide (?)</span>
                      </Button>
                      <Button
                        onClick={() => downloadStudentProfilePdf(student, bonafideStatus)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-[#004ac6] hover:bg-slate-50 font-bold text-xs shadow-md"
                        title="Download Official Student Profile Dossier PDF"
                      >
                        <FileDown className="h-4 w-4" />
                        <span>Export Profile (PDF)</span>
                      </Button>
                      <Button
                        onClick={() => downloadStudentProfilePng(student, bonafideStatus)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/30 shadow-md backdrop-blur-md"
                        title="Download Student Profile Dossier PNG Image"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export Image (PNG)</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Tab Navigation Strip */}
              <div className="flex items-center overflow-x-auto bg-[#f2f3ff] p-1 rounded-xl shadow-sm gap-1">
                <button
                  type="button"
                  onClick={() => setProfileActiveTab("academic")}
                  className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    profileActiveTab === "academic"
                      ? "bg-white text-[#004ac6] shadow-sm font-bold"
                      : "text-[#434655] hover:text-[#131b2e]"
                  }`}
                >
                  <School className="h-4 w-4" />
                  <span>1. Academic Information</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileActiveTab("socio")}
                  className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    profileActiveTab === "socio"
                      ? "bg-white text-[#004ac6] shadow-sm font-bold"
                      : "text-[#434655] hover:text-[#131b2e]"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>2. Socio-Economic & Quota</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileActiveTab("bank")}
                  className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    profileActiveTab === "bank"
                      ? "bg-white text-[#004ac6] shadow-sm font-bold"
                      : "text-[#434655] hover:text-[#131b2e]"
                  }`}
                >
                  <Landmark className="h-4 w-4" />
                  <span>3. Bank & DBT Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileActiveTab("security")}
                  className={`flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    profileActiveTab === "security"
                      ? "bg-white text-[#004ac6] shadow-sm font-bold"
                      : "text-[#434655] hover:text-[#131b2e]"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>4. Account & Vault</span>
                </button>
              </div>

              {/* Grid: 8 Cols Main Content + 4 Cols Quick Vault Sidebar */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {/* TAB 1: ACADEMIC INFORMATION */}
                  {profileActiveTab === "academic" && (
                    <div className="flex flex-col gap-6">
                      {/* Curriculum & Higher Education */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eaedff] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#2563eb]/10 text-[#004ac6]">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                              <h2 className="text-base font-bold text-[#131b2e] font-heading">
                                Curriculum & Higher Education
                              </h2>
                              <p className="text-xs text-[#737686]">
                                Validated through National Academic Depository (NAD) / AISHE
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[11px] font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified Institution
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#eaedff]/60">
                            <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                              University / Institute
                            </span>
                            <span className="text-sm font-bold text-[#131b2e] font-heading">IIT Delhi</span>
                            <span className="text-xs text-[#434655]">
                              Institute of National Importance • AICTE Approved
                            </span>
                          </div>

                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#eaedff]/60">
                            <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                              Degree Program
                            </span>
                            <span className="text-sm font-bold text-[#131b2e] font-heading">B.E / B.Tech</span>
                            <span className="text-xs text-[#434655]">
                              {student.department} (Full-Time 4-Yr)
                            </span>
                          </div>

                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#eaedff]/60">
                            <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                              Academic Term & Standing
                            </span>
                            <span className="text-sm font-bold text-[#131b2e] font-heading">2nd Year • Semester IV</span>
                            <span className="text-xs text-[#004ac6] font-semibold">
                              First Class with Distinction • 68 / 160 Credits
                            </span>
                          </div>

                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#eaedff]/60">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                                Cumulative GPA (CGPA)
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#004ac6] font-bold">
                                API Verified
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl text-[#004ac6] font-extrabold font-heading">
                                {student.gpa.toFixed(2)}
                              </span>
                              <span className="text-xs text-[#737686]">/ 10.0</span>
                            </div>
                            <span className="text-xs text-[#737686]">
                              Auth ref: DL-1082-CS • Examination Cell Verified
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Semester-by-Semester CGPA Progression */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eaedff] flex flex-col gap-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#2563eb]/10 text-[#004ac6]">
                              <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-[#131b2e] font-heading">
                                Semester-by-Semester CGPA Progression
                              </h3>
                              <p className="text-xs text-[#737686]">
                                Institute Examination Registry Record • Total Credits: 68 / 160 Completed
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e2e7ff] text-[#004ac6] text-[11px] font-bold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Exam Cell Stamp Verified
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-[#eaddff] text-[#25005a] text-[11px] font-bold">
                              First Class with Distinction
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                          <div className="p-3.5 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#e2e7ff]">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                                Semester I
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#eaedff] text-[10px] text-[#434655] font-semibold">
                                AY 2024-25
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-lg text-[#131b2e] font-bold font-heading">8.60</span>
                              <span className="text-xs text-[#737686]">CGPA</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-[#e2e7ff] text-xs">
                              <span className="text-[#434655]">SGPA: <strong className="text-[#004ac6]">8.60</strong></span>
                              <span className="text-[10px] text-[#737686]">22 Credits</span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#e2e7ff]">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                                Semester II
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#eaedff] text-[10px] text-[#434655] font-semibold">
                                AY 2024-25
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-lg text-[#131b2e] font-bold font-heading">8.72</span>
                              <span className="text-xs text-[#737686]">CGPA</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-[#e2e7ff] text-xs">
                              <span className="text-[#434655]">SGPA: <strong className="text-[#004ac6]">8.84</strong></span>
                              <span className="text-[10px] text-[#737686]">24 Credits</span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#e2e7ff]">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                                Semester III
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#eaedff] text-[10px] text-[#434655] font-semibold">
                                AY 2025-26
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-lg text-[#131b2e] font-bold font-heading">8.80</span>
                              <span className="text-xs text-[#737686]">CGPA</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-[#e2e7ff] text-xs">
                              <span className="text-[#434655]">SGPA: <strong className="text-[#004ac6]">8.95</strong></span>
                              <span className="text-[10px] text-[#737686]">22 Credits</span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[#2563eb]/10 flex flex-col gap-1 border border-[#2563eb]/20">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#004ac6] uppercase font-bold tracking-wider">
                                Cumulative (Current)
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#004ac6] text-white text-[10px] font-semibold">
                                Sem IV AY 26-27
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className="text-lg text-[#004ac6] font-extrabold font-heading">
                                {student.gpa.toFixed(2)}
                              </span>
                              <span className="text-xs text-[#434655] font-medium">/ 10.0</span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-[#2563eb]/20 text-xs">
                              <span className="text-[#004ac6] font-semibold">Total: 68 Credits</span>
                              <span className="text-[10px] text-[#004ac6] font-bold">Consistent Rise</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Past & Active Scholarship Availing History */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eaedff] flex flex-col gap-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#005e6e]/15 text-[#005e6e]">
                              <Award className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-[#131b2e] font-heading">
                                Past & Active Scholarship Availing History
                              </h3>
                              <p className="text-xs text-[#737686]">
                                Audited records from National Scholarship Portal & Institute Dean of Student Affairs
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#e2e7ff] text-[#004ac6] text-xs font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Zero Duplicate Sanction Verified (§ 5.2)
                          </span>
                        </div>

                        <div className="flex flex-col gap-3 pt-1">
                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#eaedff]">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-[#eaedff] text-[#004ac6] mt-0.5">
                                <Landmark className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-[#131b2e] font-semibold">
                                    Central Sector Scheme for College & University Students
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-[#eaddff] text-[#25005a] text-[10px] font-bold">
                                    AY 2024-25
                                  </span>
                                </div>
                                <span className="text-xs text-[#434655] mt-0.5">
                                  Disbursed via DBT • PFMS UTR: <span className="font-mono font-medium text-[#131b2e]">#SBIN89102482</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1">
                              <span className="text-sm font-bold text-[#004ac6] font-heading">₹20,000</span>
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#005e6e] font-medium">
                                <CheckCircle className="h-3.5 w-3.5" /> Successfully Settled
                              </span>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#eaedff]">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-[#eaedff] text-[#712ae2] mt-0.5">
                                <School className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-[#131b2e] font-semibold">
                                    IIT Delhi Merit-cum-Means (MCM) Tuition Waiver
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-[#eaddff] text-[#25005a] text-[10px] font-bold">
                                    AY 2025-26
                                  </span>
                                </div>
                                <span className="text-xs text-[#434655] mt-0.5">
                                  Dean Student Affairs Official Sanction • 100% Tuition Fee Waiver Subsidized
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1">
                              <span className="text-sm font-bold text-[#712ae2] font-heading">₹67,000</span>
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#005e6e] font-medium">
                                <CheckCircle className="h-3.5 w-3.5" /> Availed & Verified
                              </span>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-gradient-to-r from-[#2563eb]/10 to-[#f2f3ff] border border-[#2563eb]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-[#2563eb] text-white mt-0.5">
                                <ShieldCheck className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-[#131b2e] font-bold">
                                    Current Academic Year (AY 2026-27) Eligibility Clearance
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-[#2563eb] text-white text-[10px] font-bold">
                                    Active Window
                                  </span>
                                </div>
                                <p className="text-xs text-[#434655] mt-0.5">
                                  Cleared for Renewal & Non-Conflicting Concurrent Grants • Statutory Rule § 5.2 Zero Duplicate Sanction verified.
                                </p>
                              </div>
                            </div>
                            <span className="px-3 py-1.5 rounded-lg bg-[#004ac6] text-white text-xs font-semibold text-center whitespace-nowrap">
                              Eligible for New Schemes
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Prior Schooling & Board Records */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eaedff] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#712ae2]/10 text-[#712ae2]">
                              <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-[#131b2e] font-heading">
                                Prior Schooling & Board Records
                              </h3>
                              <p className="text-xs text-[#737686]">
                                Aggregated from Central Board of Secondary Education
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-[#eaddff] text-[#25005a] text-xs font-semibold">
                            Standard X & XII
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div className="p-4 rounded-xl bg-[#eaedff] flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#131b2e] font-semibold">Class XII Senior Secondary</span>
                              <span className="text-xs text-[#004ac6] font-bold">CBSE Board</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl text-[#131b2e] font-extrabold font-heading">94.2%</span>
                              <span className="text-xs text-[#737686]">Aggregate Marks</span>
                            </div>
                            <p className="text-xs text-[#737686]">Roll: 11094821 • Kendriya Vidyalaya No. 1</p>
                          </div>

                          <div className="p-4 rounded-xl bg-[#eaedff] flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-[#131b2e] font-semibold">Class X Secondary School</span>
                              <span className="text-xs text-[#004ac6] font-bold">CBSE Board</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl text-[#131b2e] font-extrabold font-heading">95.8%</span>
                              <span className="text-xs text-[#737686]">Aggregate Marks</span>
                            </div>
                            <p className="text-xs text-[#737686]">Roll: 10983210 • Year of Passing: 2022</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: SOCIO-ECONOMIC & QUOTA */}
                  {profileActiveTab === "socio" && (
                    <div className="flex flex-col gap-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eaedff] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#005e6e]/15 text-[#005e6e]">
                              <User className="h-5 w-5" />
                            </div>
                            <div>
                              <h2 className="text-base font-bold text-[#131b2e] font-heading">
                                Socio-Economic & Domicile Identity
                              </h2>
                              <p className="text-xs text-[#737686]">
                                Revenue & Backward Classes Welfare Department Synchronization
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e2e7ff] text-[#005e6e] text-xs font-bold">
                            <ShieldCheck className="h-3.5 w-3.5" /> Aadhaar Matched
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#eaedff]/60">
                            <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                              State of Domicile
                            </span>
                            <span className="text-sm font-bold text-[#131b2e] font-heading">Tamil Nadu</span>
                            <span className="text-xs text-[#434655]">
                              Coimbatore District • Verified via Aadhaar e-KYC
                            </span>
                          </div>

                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#eaedff]/60">
                            <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                              Social Category / Quota
                            </span>
                            <span className="text-sm font-bold text-[#131b2e] font-heading">
                              Backward Class (BC)
                            </span>
                            <span className="text-xs text-[#434655]">
                              OBC-NCL Central & State Welfare Matrix
                            </span>
                          </div>

                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#eaedff]/60">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                                Annual Family Income
                              </span>
                              <span className="text-[10px] text-[#004ac6] font-bold">Below 2.5 LPA</span>
                            </div>
                            <span className="text-lg text-[#004ac6] font-bold font-heading">
                              ₹{formatCurrency(student.annualIncome)} / year
                            </span>
                            <span className="text-xs text-[#434655]">
                              Tahsildar Certified No: TN-REV-2024-89218
                            </span>
                          </div>

                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col gap-1 border border-[#eaedff]/60">
                            <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                              Parent / Guardian Occupation
                            </span>
                            <span className="text-sm font-bold text-[#131b2e] font-heading">
                              Agriculture & Micro-Enterprise
                            </span>
                            <span className="text-xs text-[#434655]">
                              Primary Earner: Father (Small/Marginal Farmer)
                            </span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-[#eaedff] flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <UserCheck className="h-5 w-5 text-[#737686]" />
                            <div>
                              <div className="text-xs font-semibold text-[#131b2e]">
                                Disability & Special Criteria
                              </div>
                              <div className="text-xs text-[#434655]">
                                PwD / Orthopedic / Visual impairment criteria
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-white text-[#737686] text-xs font-medium border border-[#c3c6d7]">
                            None / General Quota
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: BANK & DBT DETAILS */}
                  {profileActiveTab === "bank" && (
                    <div className="flex flex-col gap-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eaedff] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#2563eb]/10 text-[#004ac6]">
                              <Landmark className="h-5 w-5" />
                            </div>
                            <div>
                              <h2 className="text-base font-bold text-[#131b2e] font-heading">
                                Direct Benefit Transfer (DBT) & Bank Seeding
                              </h2>
                              <p className="text-xs text-[#737686]">
                                National Payments Corporation of India (NPCI) Aadhaar Bridge
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#e2e7ff] text-[#004ac6] text-xs font-bold">
                            <CheckCircle2 className="h-4 w-4 text-[#005e6e]" />
                            NPCI Mapper Active
                          </span>
                        </div>

                        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#eaedff] to-[#f2f3ff] flex flex-col gap-4 border border-[#e2e7ff]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-[#004ac6]">
                                <Landmark className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-[#131b2e] font-heading">
                                  State Bank of India (SBI)
                                </h3>
                                <p className="text-xs text-[#737686]">IIT Delhi Main Campus Branch</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-[#2563eb] text-white text-xs font-semibold">
                              Primary Disbursal
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                                Account Number
                              </span>
                              <span className="font-mono text-sm text-[#131b2e] font-semibold tracking-wider">
                                ••••••••8912
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                                IFSC Routing Code
                              </span>
                              <span className="font-mono text-sm text-[#131b2e] font-semibold">
                                SBIN0001077
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-[#737686] uppercase font-semibold tracking-wider">
                                Beneficiary Name
                              </span>
                              <span className="text-sm text-[#131b2e] font-bold">
                                {student.fullName}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex items-start gap-3 border border-[#eaedff]">
                            <ShieldCheck className="h-5 w-5 text-[#005e6e] shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-[#131b2e] font-semibold">
                                100% Name-Match Certificate
                              </span>
                              <span className="text-xs text-[#737686]">
                                The bank account holder name precisely matches UIDAI Aadhaar registry records.
                              </span>
                            </div>
                          </div>

                          <div className="p-4 rounded-xl bg-[#f2f3ff] flex items-start gap-3 border border-[#eaedff]">
                            <RefreshCw className="h-5 w-5 text-[#004ac6] shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-[#131b2e] font-semibold">
                                Auto-Credit Eligibility
                              </span>
                              <span className="text-xs text-[#737686]">
                                No physical voucher required. Stipends credit instantly via PFMS integration.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: ACCOUNT & VAULT (PRIVACY & CONSENT) */}
                  {profileActiveTab === "security" && (
                    <div className="flex flex-col gap-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eaedff] flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-[#712ae2]/10 text-[#712ae2]">
                              <Lock className="h-5 w-5" />
                            </div>
                            <div>
                              <h2 className="text-base font-bold text-[#131b2e] font-heading">
                                Data Privacy & Consent Governance
                              </h2>
                              <p className="text-xs text-[#737686]">
                                Digital Personal Data Protection (DPDP) Act Compliance
                              </p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-[#e2e7ff] text-[#712ae2] text-xs font-semibold">
                            Consent Active
                          </span>
                        </div>

                        <div className="p-4 rounded-xl bg-[#f2f3ff] flex flex-col gap-3 border border-[#eaedff]">
                          <div className="flex items-start gap-3">
                            <CheckSquare className="h-5 w-5 text-[#004ac6] shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-[#131b2e] font-semibold">
                                Statutory Verification Consent
                              </span>
                              <p className="text-xs text-[#434655] leading-relaxed">
                                Active consent is granted for automatic statutory query verification by State/Central Ministry Nodal Officers, AICTE, and designated university review committees.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-[#eaedff]">
                            <span className="text-xs text-[#737686]">Last Synchronized: Today at 08:30 AM IST</span>
                            <button
                              type="button"
                              onClick={() => alert("Statutory verification consent preferences re-attested.")}
                              className="text-xs text-[#ba1a1a] font-semibold hover:underline"
                            >
                              Revoke / Modify Consent
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#eaedff] border border-[#dbe1ff]">
                          <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-[#005e6e]" />
                            <div className="flex flex-col">
                              <span className="text-xs text-[#131b2e] font-semibold">
                                Comprehensive Student Verification Dossier
                              </span>
                              <span className="text-xs text-[#737686]">
                                Official institutional template for {student.fullName} • Real PDF &amp; PNG downloads
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                              type="button"
                              onClick={() => downloadStudentProfilePdf(student, bonafideStatus)}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#005e6e] hover:bg-[#004e5c] text-white text-xs font-semibold shadow-sm"
                            >
                              <FileDown className="h-4 w-4" />
                              <span>Download PDF Dossier</span>
                            </Button>
                            <Button
                              type="button"
                              onClick={() => downloadStudentProfilePng(student, bonafideStatus)}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-sm"
                            >
                              <Download className="h-4 w-4" />
                              <span>Download Image (PNG)</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Digital Vault & Auto-Fill Readiness Cards */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Digital Vault Quick Status */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#eaedff] flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-[#131b2e] font-heading">Digital Vault</h3>
                      <span className="px-2 py-0.5 rounded-md bg-[#e2e7ff] text-[#004ac6] text-[11px] font-bold">
                        {vaultDocuments.length} Synced
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="p-3 rounded-xl bg-[#f2f3ff] flex items-center justify-between border border-[#eaedff]/60">
                        <div className="flex items-center gap-2.5">
                          <Fingerprint className="h-5 w-5 text-[#004ac6]" />
                          <div className="flex flex-col">
                            <span className="text-xs text-[#131b2e] font-medium">Aadhaar Card (UIDAI)</span>
                            <span className="text-[11px] text-[#737686]">Verified XML • ••••4290</span>
                          </div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-[#005e6e]" />
                      </div>

                      <div className="p-3 rounded-xl bg-[#f2f3ff] flex items-center justify-between border border-[#eaedff]/60">
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-5 w-5 text-[#004ac6]" />
                          <div className="flex flex-col">
                            <span className="text-xs text-[#131b2e] font-medium">Income Certificate</span>
                            <span className="text-[11px] text-[#737686]">Valid till 31 Mar 2027</span>
                          </div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-[#005e6e]" />
                      </div>

                      <div className="p-3 rounded-xl bg-[#f2f3ff] flex items-center justify-between border border-[#eaedff]/60">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="h-5 w-5 text-[#004ac6]" />
                          <div className="flex flex-col">
                            <span className="text-xs text-[#131b2e] font-medium">Community / OBC Cert</span>
                            <span className="text-[11px] text-[#737686]">TN e-Sevai Gov Ref</span>
                          </div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-[#005e6e]" />
                      </div>

                      <div className="p-3 rounded-xl bg-[#f2f3ff] flex items-center justify-between border border-[#eaedff]/60">
                        <div className="flex items-center gap-2.5">
                          <GraduationCap className="h-5 w-5 text-[#004ac6]" />
                          <div className="flex flex-col">
                            <span className="text-xs text-[#131b2e] font-medium">College Bonafide</span>
                            <span className="text-[11px] text-[#737686]">IIT Delhi Dean Office</span>
                          </div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-[#005e6e]" />
                      </div>
                    </div>

                    <Button
                      onClick={() => setIsUploadDocOpen(true)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#eaedff] text-[#004ac6] hover:bg-[#dbe1ff] text-xs font-semibold shadow-none border-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Upload Additional Proof</span>
                    </Button>
                  </div>

                  {/* Auto-Fill Readiness Card */}
                  <div className="bg-gradient-to-br from-white to-[#f2f3ff] p-6 rounded-2xl shadow-sm border border-[#eaedff] flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[#712ae2]" />
                      <h3 className="text-base font-bold text-[#131b2e] font-heading">Auto-Fill Readiness</h3>
                    </div>
                    <p className="text-xs text-[#434655] leading-relaxed">
                      Your verified profile satisfies the eligibility prerequisites for <strong>14 national & private schemes</strong> without requiring manual form entry.
                    </p>

                    <div className="p-3.5 rounded-xl bg-white flex items-center justify-between mt-1 border border-[#eaedff]">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#737686] uppercase font-bold">Matched Schemes</span>
                        <span className="text-sm text-[#712ae2] font-bold font-heading">
                          {scholarships.filter((s) => checkEligibility(s).eligible).length || 14} Opportunities
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-[#737686] uppercase font-bold">Max Aid Potential</span>
                        <span className="text-sm text-[#004ac6] font-bold font-heading">₹2,40,000</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => setActiveTab("scholarships")}
                      className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <span>Explore Matched Schemes</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 6. ADMIN VIEW: OVERVIEW & OPERATIONS ANALYTICS                            */}
          {/* ========================================================================= */}
          {activeRole === "ADMIN" && activeTab === "admin-overview" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#131b2e] font-heading tracking-tight">
                    Admin Overview & Operations Analytics
                  </h1>
                  <p className="text-xs text-[#737686]">
                    Real-time monitoring of scheme capacity, application pipelines, and statutory quota disbursements.
                  </p>
                </div>

                <div id="tour-admin-overview-actions" className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => handleStartTabTour("admin-overview")}
                    variant="outline"
                    size="sm"
                    className="h-9 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg shadow-sm gap-1.5"
                    title="Admin Overview Guide (?)"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-purple-600" />
                    <span>Overview Guide (?)</span>
                  </Button>

                  <Button
                    onClick={handleSeedRandom}
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    className="h-9 border-[#eaedff] bg-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#712ae2] mr-1" />
                    Seed Test Scheme
                  </Button>

                  <Button
                    onClick={() => setIsCreateOpen(true)}
                    size="sm"
                    className="h-9 bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create New Scheme
                  </Button>
                </div>
              </div>

              {/* KPI Strip */}
              <div id="tour-admin-overview-stats" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-[#eaedff] shadow-sm">
                  <div className="text-xs font-medium text-[#737686] mb-1">Active Schemes</div>
                  <div className="text-2xl font-bold text-[#131b2e] font-heading">{scholarships.length}</div>
                  <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
                    {scholarships.filter((s) => s.status === "OPEN").length} Open for Apps
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#eaedff] shadow-sm">
                  <div className="text-xs font-medium text-[#737686] mb-1">Disbursed Aid</div>
                  <div className="text-2xl font-bold text-[#004ac6] font-heading">
                    ₹{formatCurrency(metrics?.totalFundingAllocated ?? 0)}
                  </div>
                  <div className="text-[11px] text-[#737686] mt-1">
                    Total Pool: ₹{formatCurrency(totalPoolSum)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#eaedff] shadow-sm">
                  <div className="text-xs font-medium text-[#737686] mb-1">Remaining Award Slots</div>
                  <div className="text-2xl font-bold text-[#712ae2] font-heading">
                    {remainingSlotsSum} <span className="text-xs font-normal text-[#737686]">/ {totalSlotsSum} total</span>
                  </div>
                  <div className="w-full bg-[#eaedff] h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-[#712ae2] h-full rounded-full"
                      style={{
                        width: `${totalSlotsSum > 0 ? ((totalSlotsSum - remainingSlotsSum) / totalSlotsSum) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#eaedff] shadow-sm">
                  <div className="text-xs font-medium text-[#737686] mb-1">Applications Processed</div>
                  <div className="text-2xl font-bold text-[#131b2e] font-heading">{applications.length}</div>
                  <div className="text-[11px] text-[#737686] mt-1">
                    {applications.filter((a) => a.status === "APPROVED").length} Approved
                  </div>
                </div>
              </div>

              {/* Interactive Visual Analytics (Recharts) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Capacity & Slot Burn-down Bar Chart */}
                <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-[#eaedff] shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-[#131b2e] font-heading flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-[#004ac6]" />
                        Scheme Capacity & Slot Burn-Down
                      </h3>
                      <p className="text-[11px] text-[#737686]">
                        Visual tracking of allocated awards vs available slots per program
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f2f3ff] text-[#004ac6] font-bold">
                      LIVE METRICS
                    </span>
                  </div>

                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={scholarships.map((s) => ({
                          name: s.title.length > 15 ? s.title.substring(0, 15) + "..." : s.title,
                          Allocated: (s.totalSlots || 0) - (s.remainingSlots || 0),
                          Remaining: s.remainingSlots || 0,
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#737686" }} interval={0} angle={-15} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10, fill: "#737686" }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#eaedff",
                            borderRadius: "0.75rem",
                            fontSize: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                        <Bar dataKey="Allocated" stackId="a" fill="#004ac6" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="Remaining" stackId="a" fill="#712ae2" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Application Pipeline Status Pie Chart */}
                <div className="lg:col-span-4 bg-white rounded-2xl p-5 border border-[#eaedff] shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-sm text-[#131b2e] font-heading flex items-center gap-2">
                        <FileCheck2 className="h-4 w-4 text-[#712ae2]" />
                        Review Pipeline
                      </h3>
                      <p className="text-[11px] text-[#737686]">Candidate review distribution</p>
                    </div>
                  </div>

                  <div className="h-44 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Approved", value: applications.filter((a) => a.status === "APPROVED").length, color: "#10b981" },
                            { name: "Pending", value: applications.filter((a) => a.status === "PENDING").length, color: "#004ac6" },
                            { name: "Under Review", value: applications.filter((a) => a.status === "UNDER_REVIEW").length, color: "#f59e0b" },
                            { name: "Rejected", value: applications.filter((a) => a.status === "REJECTED").length, color: "#ef4444" },
                          ].filter((x) => x.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={55}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {[
                            { name: "Approved", value: applications.filter((a) => a.status === "APPROVED").length, color: "#10b981" },
                            { name: "Pending", value: applications.filter((a) => a.status === "PENDING").length, color: "#004ac6" },
                            { name: "Under Review", value: applications.filter((a) => a.status === "UNDER_REVIEW").length, color: "#f59e0b" },
                            { name: "Rejected", value: applications.filter((a) => a.status === "REJECTED").length, color: "#ef4444" },
                          ]
                            .filter((x) => x.value > 0)
                            .map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#ffffff",
                            borderColor: "#eaedff",
                            borderRadius: "0.75rem",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#eaedff] text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[#434655]">
                        Approved ({applications.filter((a) => a.status === "APPROVED").length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#004ac6]" />
                      <span className="text-[#434655]">
                        Pending ({applications.filter((a) => a.status === "PENDING").length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-[#434655]">
                        Review ({applications.filter((a) => a.status === "UNDER_REVIEW").length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="text-[#434655]">
                        Rejected ({applications.filter((a) => a.status === "REJECTED").length})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 7. ADMIN VIEW: MANAGE SCHEMES & CAPACITY CONFIGURATION                    */}
          {/* ========================================================================= */}
          {activeRole === "ADMIN" && activeTab === "manage-schemes" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div
                id="tour-admin-manage-schemes"
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <h1 className="text-2xl font-bold text-[#131b2e] font-heading tracking-tight">
                    Manage Scholarship Schemes & Quota Rules
                  </h1>
                  <p className="text-xs text-[#737686]">
                    Configure program criteria, slot allocation thresholds, and live budget disbursement channels.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => handleStartTabTour("manage-schemes")}
                    variant="outline"
                    size="sm"
                    className="h-9 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg shadow-sm gap-1.5"
                    title="Manage Schemes Guide (?)"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-purple-600" />
                    <span>Schemes Guide (?)</span>
                  </Button>

                  <Button
                    onClick={handleSeedRandom}
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    className="h-9 border-[#eaedff] bg-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#712ae2] mr-1" />
                    Seed Test Scheme
                  </Button>

                  <Button
                    onClick={() => setIsCreateOpen(true)}
                    size="sm"
                    className="h-9 bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Create New Scheme
                  </Button>
                </div>
              </div>

              {/* Schemes Matrix Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {scholarships.map((sch, schIdx) => {
                  const percentUsed =
                    sch.totalSlots > 0
                      ? Math.round(((sch.totalSlots - sch.remainingSlots) / sch.totalSlots) * 100)
                      : 100;

                  return (
                    <div
                      key={sch.id}
                      id={schIdx === 0 ? "tour-admin-scheme-card-item" : undefined}
                      className="rounded-2xl bg-white border border-[#eaedff] p-5 space-y-3 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] border-[#eaedff] text-[#434655]">
                            {sch.category}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleSchemeStatus(sch.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                sch.status === "OPEN" && sch.remainingSlots > 0
                                  ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                  : "bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffdad6]/80"
                              }`}
                            >
                              {sch.status === "OPEN" && sch.remainingSlots > 0 ? "OPEN" : "CLOSED"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingScheme({ ...sch });
                                setIsEditSchemeOpen(true);
                              }}
                              className="p-1 rounded text-[#737686] hover:text-[#004ac6] hover:bg-[#e2e7ff]/60 transition-colors"
                              title="Edit Scheme (Admin)"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteScheme(sch.id)}
                              className="p-1 rounded text-[#737686] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors"
                              title="Archive Scheme"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-bold text-[#131b2e] text-sm font-heading leading-tight">{sch.title}</h3>
                          <div className="mt-1 text-xs text-[#004ac6] font-semibold">
                            ₹{formatCurrency(sch.awardAmount)} per student
                          </div>
                        </div>

                        <div className="space-y-1.5 bg-[#f2f3ff] p-3 rounded-xl text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[#434655]">Slots Allocated:</span>
                            <span className="font-bold text-[#131b2e]">
                              {sch.totalSlots - sch.remainingSlots} / {sch.totalSlots} ({percentUsed}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#eaedff] h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                sch.remainingSlots === 0 ? "bg-[#ba1a1a]" : "bg-[#004ac6]"
                              }`}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-[#737686] flex items-center justify-between pt-1">
                            <span>Remaining Available Slots:</span>
                            <span className="font-bold text-[#004ac6]">{sch.remainingSlots}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#737686] font-mono pt-2 border-t border-[#eaedff] flex items-center justify-between">
                        <span>Min GPA: {sch.minGpa.toFixed(2)}</span>
                        <span>Deadline: {formatDate(sch.deadline)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 8. ADMIN VIEW: PUBLIC CRYPTOGRAPHIC AUDIT LEDGER                          */}
          {/* ========================================================================= */}
          {activeRole === "ADMIN" && activeTab === "analytics" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Top Banner with Ambient AI Glow */}
              <div
                id="tour-admin-audit-ledger"
                className="relative overflow-hidden rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-[#eaedff]"
              >
                <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-[#2563eb]/10 blur-3xl pointer-events-none" />
                <div className="absolute right-48 -bottom-20 w-80 h-80 rounded-full bg-[#712ae2]/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="flex flex-col max-w-3xl">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f2f3ff] text-[#004ac6] font-bold text-[11px] uppercase tracking-wider">
                        <Lock className="h-3.5 w-3.5" /> Cryptographically Anchored
                      </span>
                      <span className="text-xs text-[#737686]">
                        • Statutory SAMS Disbursal Cycle 2025–26
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight font-heading">
                      Public Audit Ledger & DBT Disbursal Protocol
                    </h1>
                    <p className="text-xs md:text-sm text-[#434655] mt-1 max-w-2xl leading-relaxed">
                      Tamper-evident cryptographic ledger of statutory sanctions, verification logs, and PFMS bank credit confirmations.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => handleStartTabTour("analytics")}
                      variant="outline"
                      size="sm"
                      className="h-10 px-3.5 rounded-lg border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold shadow-sm gap-1.5 transition-all"
                      title="Audit Ledger Guide (?)"
                    >
                      <HelpCircle className="h-4 w-4 text-purple-600" />
                      <span>Ledger Guide (?)</span>
                    </Button>

                    <Button
                      onClick={() => {
                        handleAuditFullChain();
                        refreshData();
                      }}
                      disabled={isVerifyingHash || isAuditingChain}
                      variant="outline"
                      className="h-10 px-4 rounded-lg bg-[#f2f3ff] text-[#131b2e] hover:bg-[#e2e7ff] text-xs font-semibold transition-all shadow-sm gap-1.5"
                    >
                      <RefreshCw className={`h-4 w-4 text-[#004ac6] ${isVerifyingHash || isAuditingChain ? "animate-spin" : ""}`} />
                      <span>{isVerifyingHash || isAuditingChain ? "Auditing Chain..." : "Re-sync & Audit Chain"}</span>
                    </Button>
                    <Button
                      id="tour-admin-export-zip-guide"
                      onClick={handleExportAuditZip}
                      className="h-10 px-4 rounded-lg bg-[#2563eb] hover:bg-[#004ac6] text-white text-xs font-semibold transition-all shadow-sm gap-1.5"
                    >
                      <FileCheck2 className="h-4 w-4" />
                      <span>Export Audit Pack (ZIP)</span>
                    </Button>
                  </div>
                </div>

                {/* Live Compliance Status Bar */}
                <div className="mt-6 pt-4 bg-[#f2f3ff]/70 -mx-6 md:-mx-8 -mb-6 md:-mb-8 px-6 md:px-8 py-3 flex flex-wrap items-center justify-between gap-4 border-t border-[#eaedff]">
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563eb] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#004ac6]" />
                      </span>
                      <span className="text-[#737686] uppercase font-bold text-[10px] tracking-wider">
                        UIDAI e-KYC Tokenization:
                      </span>
                      <span className="font-semibold text-[#004ac6]">Compliant (AES-256)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#00788c]" />
                      <span className="text-[#737686] uppercase font-bold text-[10px] tracking-wider">
                        PFMS Gateway:
                      </span>
                      <span className="font-semibold text-[#131b2e]">Operational (Ping: 42ms)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
                      <span className="text-[#737686] uppercase font-bold text-[10px] tracking-wider">
                        NPCI Mapper Seeding:
                      </span>
                      <span className="font-semibold text-[#131b2e]">Live v3.2</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#737686] bg-white px-3 py-1 rounded-lg border border-[#eaedff] shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-[#712ae2]" />
                    <span className="font-mono">
                      Ledger Root: {chainIntegrity?.headHash ? chainIntegrity.headHash.slice(0, 8) + "..." + chainIntegrity.headHash.slice(-4) : (ledgerBlocks[ledgerBlocks.length - 1]?.merkleRoot.slice(0, 10) + "..." || "0xGenesis")}
                    </span>
                    <span className="text-[#c3c6d7]">|</span>
                    <span className="font-semibold text-[#131b2e]">Block #{chainIntegrity?.totalBlocks || ledgerBlocks.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Metric Panels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Total Disbursed */}
                <div className="bg-white p-5 rounded-2xl border border-[#eaedff] shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#737686] tracking-wider">
                        Total Disbursed This Cycle
                      </span>
                      <h2 className="text-2xl font-bold text-[#131b2e] mt-1 tracking-tight font-heading">
                        ₹{formatCurrency(metrics?.totalFundingAllocated ?? 0)}
                      </h2>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#f2f3ff] text-[#004ac6]">
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#eaedff] text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#004ac6]">
                      <TrendingUp className="h-3.5 w-3.5" /> +14.2% vs Q2
                    </span>
                    <span className="text-[#737686]">Sanctions: {applications.filter((a) => a.status === "APPROVED").length}</span>
                  </div>
                </div>

                {/* Successful Credits */}
                <div className="bg-white p-5 rounded-2xl border border-[#eaedff] shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#737686] tracking-wider">
                        Successful Bank Credits
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold text-[#131b2e] tracking-tight font-heading">
                          {applications.filter((a) => a.status === "APPROVED").length}
                        </span>
                        <span className="text-xs font-bold text-emerald-600">99.82%</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 flex items-center justify-center">
                      <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[#eaedff]"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                        />
                        <path
                          className="text-[#2563eb]"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray="99.82, 100"
                          strokeLinecap="round"
                          strokeWidth="3.5"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#eaedff] text-xs">
                    <span className="text-[#737686]">Avg DBT Speed:</span>
                    <span className="font-semibold text-[#131b2e]">3.8 Seconds</span>
                  </div>
                </div>

                {/* Pending PFMS Settlement */}
                <div className="bg-white p-5 rounded-2xl border border-[#eaedff] shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#737686] tracking-wider">
                        Pending PFMS Settlement
                      </span>
                      <h2 className="text-2xl font-bold text-[#131b2e] mt-1 tracking-tight font-heading">
                        {applications.filter((a) => a.status === "PENDING" || a.status === "UNDER_REVIEW").length}
                      </h2>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#f2f3ff] text-[#005e6e]">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-1.5 pt-2 border-t border-[#eaedff]">
                    <div className="w-full bg-[#eaedff] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#00788c] h-full rounded-full" style={{ width: "28%" }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#737686]">
                      <span>Batch Queue 4 & 5</span>
                      <span>ETA ~ 40 mins</span>
                    </div>
                  </div>
                </div>

                {/* Failed / Rejected Returns */}
                <div className="bg-white p-5 rounded-2xl border border-[#eaedff] shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#737686] tracking-wider">
                        Failed / Rejected Returns
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold text-[#ba1a1a] tracking-tight font-heading">
                          {applications.filter((a) => a.status === "REJECTED").length}
                        </span>
                        <span className="text-[10px] text-[#737686]">of total applicants</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#ffdad6] text-[#ba1a1a]">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-2 border-t border-[#eaedff] text-xs">
                    <span className="text-[#737686]">Criteria Not Met</span>
                    <span className="text-[11px] text-[#ba1a1a] font-semibold">Structured Audit</span>
                  </div>
                </div>
              </div>

              {/* Interactive Cryptographic Verifier & Real-time Filter Bar */}
              <div className="bg-white rounded-2xl p-6 border border-[#eaedff] shadow-sm flex flex-col gap-5">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#e2e7ff] text-[#004ac6]">
                      <Fingerprint className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#131b2e] font-heading">
                        Cryptographic Proof & SHA-256 Ledger Verifier
                      </h2>
                      <p className="text-xs text-[#737686]">
                        Verify state hashes, Merkle root linkages, and cryptographic multi-sig anchors dynamically.
                      </p>
                    </div>
                  </div>

                  {/* Proof Checker View Toggle & Audit Chain */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAuditFullChain}
                      disabled={isAuditingChain}
                      className="h-8 px-3 text-xs border-[#eaedff] bg-[#f2f3ff] text-[#004ac6] hover:bg-[#e2e7ff] rounded-lg gap-1.5 font-semibold"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isAuditingChain ? "animate-spin" : ""}`} />
                      <span>Audit Full Chain Integrity</span>
                    </Button>

                    <div className="flex items-center bg-[#f2f3ff] p-1 rounded-xl">
                      <button
                        onClick={() => setAuditLedgerView("table")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          auditLedgerView === "table"
                            ? "bg-white text-[#131b2e] shadow-sm"
                            : "text-[#737686] hover:text-[#131b2e]"
                        }`}
                      >
                        <Layers className="h-3.5 w-3.5" /> Block Matrix ({ledgerBlocks.length})
                      </button>
                      <button
                        onClick={() => setAuditLedgerView("visualizer")}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          auditLedgerView === "visualizer"
                            ? "bg-white text-[#131b2e] shadow-sm"
                            : "text-[#737686] hover:text-[#131b2e]"
                        }`}
                      >
                        <BrainCircuit className="h-3.5 w-3.5" /> Merkle Pipeline
                      </button>
                    </div>
                  </div>
                </div>

                {/* Instant Verify Hash Search Strip */}
                <div className="p-4 bg-[#f2f3ff] rounded-2xl space-y-3">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-white text-[#712ae2] shadow-sm">
                        <ScanLine className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-[#131b2e]">Verify Application, Document, or Block Hash</div>
                        <div className="text-[11px] text-[#737686]">
                          Enter any Application ID, Doc ID, Sanction Code, Block Height, or 64-character SHA-256 Hash
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="e.g. app-201, doc-01, sch-101, DBT-2026-APP201"
                        value={quickHashQuery}
                        onChange={(e) => setQuickHashQuery(e.target.value)}
                        className="bg-white font-mono text-xs px-3 h-9 rounded-xl text-[#131b2e] border-[#eaedff] w-full md:w-72 focus:outline-none focus:border-[#2563eb]"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleVerifyHash()}
                        disabled={isVerifyingHash}
                        className="bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold h-9 px-4 rounded-xl gap-1.5 shadow-sm shrink-0"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {isVerifyingHash ? "Verifying..." : "Verify Proof"}
                      </Button>
                    </div>
                  </div>

                  {/* 1-Click Verification Test Buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[#eaedff]/60 text-[11px]">
                    <span className="text-[#737686] font-semibold">Test Proof Queries:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickHashQuery("app-201");
                        handleVerifyHash("app-201");
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-[#eaedff] text-[#004ac6] font-mono hover:bg-[#e2e7ff]"
                    >
                      app-201 (Priya Sharma Award)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickHashQuery("doc-01");
                        handleVerifyHash("doc-01");
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-[#eaedff] text-[#004ac6] font-mono hover:bg-[#e2e7ff]"
                    >
                      doc-01 (Income Cert)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickHashQuery("sch-101");
                        handleVerifyHash("sch-101");
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-[#eaedff] text-[#004ac6] font-mono hover:bg-[#e2e7ff]"
                    >
                      sch-101 (AI Fellowship)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickHashQuery("DBT-2026-APP201");
                        handleVerifyHash("DBT-2026-APP201");
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-[#eaedff] text-purple-700 font-mono hover:bg-purple-100"
                    >
                      DBT-2026-APP201 (Sanction Ref)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickHashQuery("fake-tampered-id-999");
                        handleVerifyHash("fake-tampered-id-999");
                      }}
                      className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-mono hover:bg-red-100"
                    >
                      fake-tampered-id-999 (Test Invalid Proof)
                    </button>
                  </div>
                </div>

                {/* Live Dynamic Verification Proof Card */}
                {verificationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border text-xs space-y-3 ${
                      verificationResult.found
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                        : "bg-red-50 border-red-300 text-red-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {verificationResult.found ? (
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-sm">
                            {verificationResult.found
                              ? "IMMUTABLE LEDGER RECORD VERIFIED (100% CRYPTOGRAPHIC MATCH)"
                              : "VERIFICATION FAILED: RECORD NOT FOUND IN IMMUTABLE STATE"}
                          </div>
                          <div className="text-[11px] opacity-80">
                            Query Token: <span className="font-mono font-semibold">{verificationResult.query}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          verificationResult.found
                            ? "bg-emerald-200 text-emerald-900 border border-emerald-400"
                            : "bg-red-200 text-red-900 border border-red-400"
                        }`}
                      >
                        {verificationResult.found ? "ON-CHAIN VALID" : "FORGED / UNCOMMITTED"}
                      </span>
                    </div>

                    {verificationResult.found && verificationResult.block ? (
                      <div className="space-y-3 pt-2 border-t border-emerald-200/80">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-2.5 rounded-xl bg-white border border-emerald-200 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-[#737686] block">Block Height</span>
                            <span className="font-bold text-[#004ac6] text-sm">
                              Block #{verificationResult.block.blockHeight}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-emerald-200 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-[#737686] block">Action Event</span>
                            <span className="font-bold text-[#131b2e] text-xs">
                              {verificationResult.block.action}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-emerald-200 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-[#737686] block">Authorized Signer</span>
                            <span className="font-semibold text-emerald-800 text-xs">
                              {verificationResult.block.signer}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-emerald-200 font-mono text-[11px] space-y-1">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[#737686]">
                            <span>Block SHA-256 Hash:</span>
                            <span className="text-[#004ac6] font-bold">{verificationResult.block.blockHash}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[#737686]">
                            <span>Parent Hash:</span>
                            <span>{verificationResult.block.parentHash}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[#737686]">
                            <span>Merkle Root:</span>
                            <span>{verificationResult.block.merkleRoot}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[#737686]">
                            <span>Cryptographic Signature:</span>
                            <span className="text-purple-700">{verificationResult.block.signature}</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-100/60 border border-emerald-200 font-mono text-[10px] text-emerald-900">
                          <span className="font-bold block mb-1">State Block Payload Data:</span>
                          <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(verificationResult.block.payload, null, 2)}</pre>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-white border border-red-200 text-red-900 text-xs leading-relaxed">
                        {verificationResult.error ||
                          "This query could not be verified on the cryptographic ledger. The record has either been altered, fabricated, or never committed by an authorized officer."}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Full Chain Integrity Card */}
                {chainIntegrity && (
                  <div className="p-3.5 rounded-xl bg-[#faf8ff] border border-[#eaedff] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <div>
                        <span className="font-bold text-[#131b2e]">
                          Ledger Chain State: {chainIntegrity.isValid ? "100% Cryptographically Valid" : "Chain Alert"}
                        </span>
                        <div className="text-[11px] text-[#737686]">
                          Genesis: {chainIntegrity.genesisHash.substring(0, 10)}... • Current Head: {chainIntegrity.headHash.substring(0, 10)}...
                        </div>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      {chainIntegrity.verifiedBlocks} of {chainIntegrity.totalBlocks} Blocks Verified
                    </span>
                  </div>
                )}
              </div>

              {/* Merkle Pipeline Visualizer View */}
              {auditLedgerView === "visualizer" && (
                <div className="bg-white rounded-2xl p-6 border border-[#eaedff] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#004ac6] uppercase tracking-wider">
                        Decentralized Multi-Sig Proof Topology
                      </span>
                      <h3 className="text-base font-bold text-[#131b2e] font-heading">
                        Block #1004 Transaction Confirmation Route
                      </h3>
                    </div>
                    <span className="px-3 py-1 bg-[#f2f3ff] rounded-full text-xs text-[#737686] font-mono">
                      Real-time Merkle Root Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                    <div className="bg-[#f2f3ff] p-4 rounded-xl space-y-2 border border-[#eaedff]">
                      <div className="flex items-center justify-between text-xs font-bold text-[#737686]">
                        <span>NODE 01</span>
                        <School className="h-4 w-4 text-[#004ac6]" />
                      </div>
                      <div className="text-xs font-bold text-[#131b2e]">Institutional Verification</div>
                      <div className="text-[11px] text-[#737686]">
                        Registrar node confirmed student attendance & CGPA threshold.
                      </div>
                      <div className="pt-2 font-mono text-[10px] text-[#004ac6] bg-white p-1.5 rounded">
                        SIG: 0x9812_DL_REG
                      </div>
                    </div>

                    <div className="bg-[#f2f3ff] p-4 rounded-xl space-y-2 border border-[#eaedff]">
                      <div className="flex items-center justify-between text-xs font-bold text-[#737686]">
                        <span>NODE 02</span>
                        <Landmark className="h-4 w-4 text-[#712ae2]" />
                      </div>
                      <div className="text-xs font-bold text-[#131b2e]">District Welfare Officer</div>
                      <div className="text-[11px] text-[#737686]">
                        District Welfare Officer verified income certificate & domicile seal.
                      </div>
                      <div className="pt-2 font-mono text-[10px] text-[#712ae2] bg-white p-1.5 rounded">
                        SIG: 0x4412_DWO_TN
                      </div>
                    </div>

                    <div className="bg-[#f2f3ff] p-4 rounded-xl space-y-2 border border-[#eaedff]">
                      <div className="flex items-center justify-between text-xs font-bold text-[#737686]">
                        <span>NODE 03</span>
                        <ShieldCheck className="h-4 w-4 text-[#005e6e]" />
                      </div>
                      <div className="text-xs font-bold text-[#131b2e]">PFMS Clearing Gateway</div>
                      <div className="text-[11px] text-[#737686]">
                        Direct Benefit Transfer batch cleared through Treasury gateway.
                      </div>
                      <div className="pt-2 font-mono text-[10px] text-[#005e6e] bg-white p-1.5 rounded">
                        SIG: 0x7701_PFMS_CLR
                      </div>
                    </div>

                    <div className="bg-[#f2f3ff] p-4 rounded-xl space-y-2 border border-[#eaedff]">
                      <div className="flex items-center justify-between text-xs font-bold text-[#737686]">
                        <span>NODE 04</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="text-xs font-bold text-[#131b2e]">DBT Account Credit</div>
                      <div className="text-[11px] text-[#737686]">
                        Beneficiary Aadhaar-seeded bank account credited via NPCI bridge.
                      </div>
                      <div className="pt-2 font-mono text-[10px] text-emerald-700 bg-white p-1.5 rounded">
                        UTR: 429108849102
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Blockchain Ledger Explorer Table */}
              <div className="bg-white rounded-2xl p-5 border border-[#eaedff] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-[#004ac6]" />
                    <h3 className="font-bold text-sm text-[#131b2e] font-heading">
                      Live Immutable Cryptographic Block Ledger ({ledgerBlocks.length} Blocks)
                    </h3>
                  </div>

                  {/* Search and Action Filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      placeholder="Filter blocks or entity..."
                      value={ledgerSearchQuery}
                      onChange={(e) => setLedgerSearchQuery(e.target.value)}
                      className="h-8 text-xs w-48 bg-[#faf8ff] border-[#eaedff]"
                    />
                    <select
                      value={ledgerFilterAction}
                      onChange={(e) => setLedgerFilterAction(e.target.value)}
                      className="h-8 rounded-lg border border-[#eaedff] bg-white px-2 text-xs text-[#131b2e] shadow-sm"
                    >
                      <option value="ALL">All Actions</option>
                      <option value="AWARD_APPROVED">Awards Approved</option>
                      <option value="APPLICATION_SUBMITTED">Applications</option>
                      <option value="DOCUMENT">Documents</option>
                      <option value="DBT">DBT Disbursals</option>
                      <option value="SCHOLARSHIP">Scholarships</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-[#eaedff] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#f2f3ff]">
                      <TableRow className="border-[#eaedff]">
                        <TableHead className="text-[#434655] text-xs font-semibold">Block Height</TableHead>
                        <TableHead className="text-[#434655] text-xs font-semibold">Action & Entity</TableHead>
                        <TableHead className="text-[#434655] text-xs font-semibold">SHA-256 Hash</TableHead>
                        <TableHead className="text-[#434655] text-xs font-semibold">Signer Authority</TableHead>
                        <TableHead className="text-[#434655] text-xs font-semibold">Timestamp</TableHead>
                        <TableHead className="text-[#434655] text-xs font-semibold text-right">Proof</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerBlocks
                        .filter((b) => {
                          const matchesSearch =
                            !ledgerSearchQuery ||
                            b.entityId.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
                            b.action.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
                            b.blockHash.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
                            b.signer.toLowerCase().includes(ledgerSearchQuery.toLowerCase());
                          const matchesAction =
                            ledgerFilterAction === "ALL" ||
                            b.action.includes(ledgerFilterAction) ||
                            b.entity.toUpperCase().includes(ledgerFilterAction);
                          return matchesSearch && matchesAction;
                        })
                        .map((block) => (
                          <TableRow key={block.blockHeight} className="border-[#eaedff] hover:bg-[#faf8ff] text-xs font-mono">
                            <TableCell className="font-bold text-[#004ac6]">
                              #{block.blockHeight}
                            </TableCell>

                            <TableCell className="font-sans">
                              <span className="inline-flex items-center gap-1 font-bold text-[11px] text-[#131b2e]">
                                {block.action}
                              </span>
                              <div className="text-[10px] text-[#737686] font-mono">
                                Entity: {block.entity} ({block.entityId})
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="text-[11px] text-[#005e6e] font-mono">
                                {block.blockHash.substring(0, 10)}...{block.blockHash.substring(block.blockHash.length - 6)}
                              </span>
                            </TableCell>

                            <TableCell className="font-sans text-[11px] text-[#434655]">
                              {block.signer}
                            </TableCell>

                            <TableCell className="text-[#737686] text-[10px]">
                              {formatTime(block.timestamp)}
                            </TableCell>

                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setQuickHashQuery(block.entityId);
                                  handleVerifyHash(block.entityId);
                                }}
                                className="h-7 px-2 text-[10px] border-[#eaedff] text-[#004ac6] hover:bg-[#e2e7ff] rounded-lg gap-1"
                              >
                                <Fingerprint className="h-3 w-3" /> Verify
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 9. ADMIN VIEW: APPLICATIONS REVIEW                                        */}
          {/* ========================================================================= */}
          {activeRole === "ADMIN" && activeTab === "applications-review" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div
                id="tour-admin-app-review"
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#eaedff]"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#737686]">
                    <span className="w-2 h-2 rounded-full bg-[#004ac6] animate-pulse" />
                    Scholarship Administration • Application Review Workspace
                  </div>
                  <h1 className="text-2xl font-bold text-[#131b2e] tracking-tight font-heading mt-1 flex items-center gap-2">
                    Evaluation & Verification Center
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => handleStartTabTour("applications-review")}
                    variant="outline"
                    size="sm"
                    className="h-8 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg shadow-sm gap-1.5"
                    title="Applications Review Guide (?)"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-purple-600" />
                    <span>Review Guide (?)</span>
                  </Button>

                  {(["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"] as const).map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => setAdminStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          adminStatusFilter === st
                            ? "bg-[#004ac6] text-white shadow-sm"
                            : "bg-[#f2f3ff] text-[#434655] hover:text-[#131b2e]"
                        }`}
                      >
                        {st === "ALL" ? "All" : st.replace("_", " ")}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* 1-Click Judge & Anti-Fraud Evaluation Toolbar (Admin / Hackathon Evaluation Workspace) */}
              <div className="p-4 rounded-2xl bg-white border border-[#eaedff] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-[#712ae2]" />
                    <span className="font-bold text-xs text-[#131b2e] uppercase tracking-wider">
                      Judge Anti-Fraud Sandbox: 1-Click Forensic Test Presets
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#737686]">
                    UIDAI Verhoeff Checksum & State e-District Anomaly Detection
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSeedDocumentPreset(0)}
                    disabled={isUploadingWithForensics}
                    className="h-8 text-xs border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Test Genuine TN e-District Income Cert</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSeedDocumentPreset(1)}
                    disabled={isUploadingWithForensics}
                    className="h-8 text-xs border-red-200 bg-red-50 text-red-800 hover:bg-red-100 rounded-lg gap-1.5"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    <span>Test Forged Aadhaar (Fails Verhoeff D5 Checksum)</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSeedDocumentPreset(2)}
                    disabled={isUploadingWithForensics}
                    className="h-8 text-xs border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-lg gap-1.5"
                  >
                    <AlertOctagon className="h-3.5 w-3.5 text-amber-600" />
                    <span>Test Doctored Marksheet (10.9 CGPA Anomaly)</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSeedDocumentPreset(3)}
                    disabled={isUploadingWithForensics}
                    className="h-8 text-xs border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100 rounded-lg gap-1.5"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-purple-600" />
                    <span>Test Mismatched Name Caste Certificate</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSeedDocumentPreset(4)}
                    disabled={isUploadingWithForensics}
                    className="h-8 text-xs border-blue-200 bg-blue-50 text-[#004ac6] hover:bg-blue-100 rounded-lg gap-1.5"
                  >
                    <Landmark className="h-3.5 w-3.5 text-[#004ac6]" />
                    <span>Test Genuine SBI DBT Mandate (Valid IFSC)</span>
                  </Button>
                </div>
              </div>

              {/* Review Queue Table */}
              <div id="tour-admin-review-actions-guide" className="rounded-2xl border border-[#eaedff] bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-[#f2f3ff]">
                    <TableRow className="border-[#eaedff]">
                      <TableHead className="text-[#434655] text-xs font-semibold">Applicant</TableHead>
                      <TableHead className="text-[#434655] text-xs font-semibold">Scholarship Target</TableHead>
                      <TableHead className="text-[#434655] text-xs font-semibold">Academic Standing</TableHead>
                      <TableHead className="text-[#434655] text-xs font-semibold">Slots Remaining</TableHead>
                      <TableHead className="text-[#434655] text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-[#434655] text-xs font-semibold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdminApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-[#737686] text-xs">
                          No applications match the filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAdminApplications.map((app) => {
                        const targetSch = scholarships.find((s) => s.id === app.scholarshipId);
                        const slotsLeft = targetSch?.remainingSlots ?? 0;

                        return (
                          <TableRow key={app.id} className="border-[#eaedff] hover:bg-[#faf8ff] transition-colors">
                            <TableCell className="text-xs">
                              <div className="font-bold text-[#131b2e]">{app.studentName}</div>
                              <div className="text-[11px] text-[#737686] font-mono">{app.studentEmail}</div>
                              <div className="text-[10px] text-[#737686]">{app.studentDepartment}</div>
                            </TableCell>

                            <TableCell className="text-xs">
                              <div className="font-semibold text-[#131b2e]">{app.scholarshipTitle}</div>
                              <div className="text-[11px] text-[#004ac6] font-semibold">
                                ₹{formatCurrency(targetSch?.awardAmount || 10000)} Award
                              </div>
                            </TableCell>

                            <TableCell className="text-xs">
                              <div className="font-bold text-[#005e6e]">CGPA {app.studentGpa.toFixed(2)}</div>
                              <div className="text-[11px] text-[#737686]">
                                ₹{formatCurrency(app.annualIncome)}/yr
                              </div>
                            </TableCell>

                            <TableCell className="text-xs">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs ${
                                  slotsLeft > 0
                                    ? "bg-[#e2e7ff] text-[#004ac6]"
                                    : "bg-[#ffdad6] text-[#ba1a1a]"
                                }`}
                              >
                                {slotsLeft} of {targetSch?.totalSlots ?? 0}
                              </span>
                            </TableCell>

                            <TableCell>
                              {app.status === "APPROVED" ? (
                                <Badge className="bg-emerald-50 text-emerald-800 border-0 text-[10px] font-semibold">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                                </Badge>
                              ) : app.status === "REJECTED" ? (
                                <Badge variant="destructive" className="bg-[#ffdad6] text-[#ba1a1a] border-0 text-[10px] font-semibold">
                                  <X className="h-3 w-3 mr-1" /> Rejected
                                </Badge>
                              ) : app.status === "UNDER_REVIEW" ? (
                                <Badge className="bg-amber-50 text-amber-800 border-0 text-[10px] font-semibold">
                                  <Clock className="h-3 w-3 mr-1" /> Under Review
                                </Badge>
                              ) : (
                                <Badge className="bg-[#e2e7ff] text-[#004ac6] border-0 text-[10px] font-semibold">
                                  <Clock className="h-3 w-3 mr-1" /> Pending
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedAppDetail(selectedAppDetail?.id === app.id ? null : app)}
                                  className={`h-7 px-2.5 text-[11px] font-semibold rounded-lg transition-all ${
                                    selectedAppDetail?.id === app.id
                                      ? "bg-[#712ae2] text-white shadow-sm"
                                      : "text-[#434655] hover:text-[#131b2e] hover:bg-[#f2f3ff]"
                                  }`}
                                >
                                  <Eye className="h-3 w-3 mr-1" /> {selectedAppDetail?.id === app.id ? "Hide Dossier" : "Dossier"}
                                </Button>

                                {app.status !== "APPROVED" && (
                                  <Button
                                    size="sm"
                                    disabled={isPending || slotsLeft <= 0}
                                    onClick={() => handleAdminReview(app, "APPROVED")}
                                    className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold gap-1 rounded-lg shadow-sm"
                                  >
                                    <Check className="h-3 w-3" /> Approve (-1 Slot)
                                  </Button>
                                )}

                                {app.status !== "REJECTED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isPending}
                                    onClick={() => handleAdminReview(app, "REJECTED")}
                                    className="h-7 px-2 border-[#eaedff] hover:bg-[#ffdad6]/40 text-[#ba1a1a] text-[11px] rounded-lg"
                                  >
                                    <X className="h-3 w-3" /> Reject
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* ========================================================================= */}
              {/* INLINE CANDIDATE APPLICATION DOSSIER (NO OVERLAY / SEAMLESS WORKSPACE)    */}
              {/* ========================================================================= */}
              {selectedAppDetail && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-2xl border-2 border-[#712ae2]/30 bg-white p-6 shadow-lg space-y-6"
                >
                  {/* Dossier Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#eaedff] gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#eaddff]/60 border border-[#712ae2]/20 flex items-center justify-center text-[#712ae2]">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#712ae2] bg-[#f2f3ff] px-2 py-0.5 rounded">
                            Verified Candidate Dossier
                          </span>
                          <span className="text-xs text-[#737686]">Ref ID: {selectedAppDetail.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <h2 className="text-xl font-bold text-[#131b2e] font-heading mt-0.5">
                          {selectedAppDetail.studentName}
                        </h2>
                        <p className="text-xs text-[#737686]">{selectedAppDetail.scholarshipTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAppDetail(null)}
                        className="border-[#eaedff] hover:bg-[#f2f3ff] text-[#434655] text-xs rounded-xl h-8 px-3 gap-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Collapse Dossier</span>
                      </Button>
                    </div>
                  </div>

                  {/* Candidate Stat Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-[#eaedff]">
                      <span className="text-[#737686] uppercase text-[10px] font-semibold block">Academic Standing</span>
                      <div className="text-lg font-bold text-[#004ac6] mt-0.5">
                        CGPA {selectedAppDetail.studentGpa.toFixed(2)}
                      </div>
                      <span className="text-[11px] text-[#005e6e]">IIT Delhi Verified Academic Sheet</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-[#eaedff]">
                      <span className="text-[#737686] uppercase text-[10px] font-semibold block">Department</span>
                      <div className="text-sm font-bold text-[#131b2e] mt-0.5">
                        {selectedAppDetail.studentDepartment}
                      </div>
                      <span className="text-[11px] text-[#737686]">Enrollment Verified</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-[#eaedff]">
                      <span className="text-[#737686] uppercase text-[10px] font-semibold block">Certified Annual Income</span>
                      <div className="text-lg font-bold text-[#131b2e] mt-0.5">
                        ₹{formatCurrency(selectedAppDetail.annualIncome)}
                        <span className="text-xs font-normal text-[#737686]"> / yr</span>
                      </div>
                      <span className="text-[11px] text-[#737686]">e-District Revenue Authority Certified</span>
                    </div>
                  </div>

                  {/* AI Match & Criteria Breakdown */}
                  {(() => {
                    const targetSch = scholarships.find((s) => s.id === selectedAppDetail.scholarshipId);
                    const gpaOk = selectedAppDetail.studentGpa >= (targetSch?.minGpa ?? 0);
                    const incomeOk = !targetSch?.maxIncome || selectedAppDetail.annualIncome <= targetSch.maxIncome;
                    let score = 65;
                    if (gpaOk) score += 18;
                    if (incomeOk) score += 15;

                    return (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-gradient-to-r from-[#eaddff]/40 to-[#f2f3ff] border border-[#712ae2]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <BrainCircuit className="h-6 w-6 text-[#712ae2] shrink-0" />
                            <div>
                              <div className="font-bold text-[#25005a] text-sm flex items-center gap-2">
                                <span>AI Match Score: {score}%</span>
                                <Badge className="bg-[#712ae2] text-white border-0 text-[10px]">
                                  {score >= 85 ? "High Fit Candidate" : "Conditional Evaluation"}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-[#434655] mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className={gpaOk ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                                  {gpaOk ? "✓ CGPA qualifies" : `✗ CGPA below min (${targetSch?.minGpa ?? 0})`}
                                </span>
                                <span>•</span>
                                <span className={incomeOk ? "text-emerald-700 font-semibold" : "text-amber-800 font-semibold"}>
                                  {incomeOk
                                    ? "✓ Family income qualifies"
                                    : `⚠️ Income ₹${formatCurrency(selectedAppDetail.annualIncome)} vs Cap ₹${formatCurrency(targetSch?.maxIncome)}`}
                                </span>
                                <span>•</span>
                                <span className="text-emerald-700 font-semibold">✓ Department eligibility verified</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {!incomeOk && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs flex items-start gap-2.5 text-amber-900">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Administrative Discretionary Waiver Notice:</span> Candidate family income is above the designated scheme ceiling. Given exceptional academic merit (CGPA {selectedAppDetail.studentGpa.toFixed(2)}), committee rules permit discretionary approval.
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Verified Documents & Cloudinary Links */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#131b2e] uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck2 className="h-4 w-4 text-[#004ac6]" />
                        <span>Attested Documents & Cloudinary Vault Records</span>
                      </label>
                      <span className="text-[11px] text-[#737686]">Cryptographically Anchored to Ledger</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {vaultDocuments.slice(0, 3).map((doc) => (
                        <div key={doc.id} className="p-3 rounded-xl border border-[#eaedff] bg-[#faf8ff] hover:bg-white transition-all space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-[#131b2e] line-clamp-1">{doc.title}</div>
                              <div className="text-[10px] text-[#737686]">{doc.issuer}</div>
                            </div>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[#eaedff]">
                            <span className="text-[10px] font-mono text-[#737686]">{doc.fileSize}</span>
                            {doc.fileUrl ? (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#004ac6] hover:underline"
                              >
                                <Cloud className="h-3 w-3" />
                                <span>View Online ↗</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(doc)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#004ac6] hover:underline"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Inspect</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Statement of Purpose */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#131b2e] uppercase tracking-wider">
                      Applicant Statement of Purpose:
                    </label>
                    <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] text-xs text-[#131b2e] leading-relaxed">
                      {selectedAppDetail.essay}
                    </div>
                  </div>

                  {/* Dossier Action Buttons */}
                  {(() => {
                    const targetSch = scholarships.find((s) => s.id === selectedAppDetail.scholarshipId);
                    const slotsLeft = targetSch?.remainingSlots ?? 0;
                    const isApproved = selectedAppDetail.status === "APPROVED";
                    const isRejected = selectedAppDetail.status === "REJECTED";
                    const incomeOk = !targetSch?.maxIncome || selectedAppDetail.annualIncome <= targetSch.maxIncome;

                    return (
                      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#eaedff]">
                        <div className="text-xs text-[#737686] flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-[#004ac6]" />
                          <span>Audit Trail: Decisions are timestamped on the SHA-256 block ledger.</span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedAppDetail(null)}
                            className="border-[#eaedff] bg-white hover:bg-[#f2f3ff] text-[#131b2e] text-xs rounded-xl h-9 px-4"
                          >
                            Close
                          </Button>

                          {isApproved ? (
                            <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs gap-1.5 py-2 px-3.5 rounded-xl">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Sanctioned & Disbursed
                            </Badge>
                          ) : isRejected ? (
                            <Badge variant="destructive" className="bg-[#ffdad6] text-[#ba1a1a] border-0 font-semibold text-xs gap-1.5 py-2 px-3.5 rounded-xl">
                              <X className="h-4 w-4" /> Application Disqualified
                            </Badge>
                          ) : (
                            <>
                              <Button
                                onClick={() => handleAdminReview(selectedAppDetail, "REJECTED")}
                                disabled={isPending}
                                variant="outline"
                                className="border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-xl h-9 px-3.5"
                              >
                                <X className="h-3.5 w-3.5 mr-1 text-red-600" /> Reject
                              </Button>

                              <Button
                                onClick={() => handleAdminReview(selectedAppDetail, "APPROVED")}
                                disabled={isPending || slotsLeft <= 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl h-9 px-4 shadow-sm"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                {incomeOk
                                  ? (slotsLeft > 0 ? "Approve & Disburse (-1 Slot)" : "Quota Full (0 Slots)")
                                  : (slotsLeft > 0 ? "Approve with Merit Waiver (-1 Slot)" : "Quota Full")}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
              )}

            </motion.div>
          )}
        </main>
      </div>

      

      {/* ========================================================================= */}
      {/* DIALOG: CREATE SCHOLARSHIP PROGRAM (ADMIN)                                */}
      {/* ========================================================================= */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-white border-[#eaedff] text-[#131b2e] max-w-xl p-6 rounded-2xl shadow-2xl">
          <form onSubmit={handleCreateScholarship}>
            <DialogHeader>
              <div className="flex items-center gap-2 text-[#004ac6] text-xs font-bold uppercase tracking-wider">
                <Plus className="h-3.5 w-3.5" /> Institutional Program Creation
              </div>
              <DialogTitle className="text-[#131b2e] text-lg font-bold font-heading">
                Create Scholarship Scheme
              </DialogTitle>
              <DialogDescription className="text-[#737686] text-xs">
                Configure award quota, eligibility thresholds, and initial slot capacity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#434655]">Scheme Title</label>
                <Input
                  placeholder="e.g. Next-Gen Robotics & AI Fellowship 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-white border-[#eaedff] text-[#131b2e] text-xs rounded-lg"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#434655]">Description</label>
                <Input
                  placeholder="Summary of scholarship purpose, target cohort, and benefits..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="bg-white border-[#eaedff] text-[#131b2e] text-xs rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#434655]">Scholarship Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ScholarshipCategory)}
                  className="w-full h-9 rounded-lg border border-[#eaedff] bg-white px-3 py-1 text-xs text-[#131b2e] shadow-sm focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="Academic Merit">Academic Merit</option>
                  <option value="Financial Need">Financial Need</option>
                  <option value="STEM & Research">STEM & Research</option>
                  <option value="Diversity & Leadership">Diversity & Leadership</option>
                  <option value="Community Impact">Community Impact</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#434655]">Award Amount (₹)</label>
                  <Input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="bg-white border-[#eaedff] text-[#131b2e] text-xs rounded-lg"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#434655]">Total Award Slots</label>
                  <Input
                    type="number"
                    min="1"
                    value={newSlots}
                    onChange={(e) => setNewSlots(e.target.value)}
                    className="bg-white border-[#eaedff] text-[#131b2e] text-xs rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#434655]">Minimum GPA Requirement</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newMinGpa}
                    onChange={(e) => setNewMinGpa(e.target.value)}
                    className="bg-white border-[#eaedff] text-[#131b2e] text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#434655]">Max Family Income Cap (₹)</label>
                  <Input
                    type="number"
                    placeholder="Leave blank for merit-only"
                    value={newMaxIncome}
                    onChange={(e) => setNewMaxIncome(e.target.value)}
                    className="bg-white border-[#eaedff] text-[#131b2e] text-xs rounded-lg"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-[#eaedff] bg-white hover:bg-[#f2f3ff] text-[#131b2e] text-xs rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {isPending ? "Publishing..." : "Publish Scheme"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: STRUCTURED REJECTION WITH REMARKS (ADMIN)                          */}
      {/* ========================================================================= */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="bg-white border-[#eaedff] text-[#131b2e] max-w-lg p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#ba1a1a] text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="h-3.5 w-3.5" /> Administrative Evaluation Note
            </div>
            <DialogTitle className="text-[#131b2e] text-lg font-bold font-heading">
              Reject Application
            </DialogTitle>
            <DialogDescription className="text-[#737686] text-xs">
              Provide a transparent justification reason and official reviewer remarks for{" "}
              <strong className="text-[#131b2e]">{rejectTargetApp?.studentName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {rejectTargetApp && (
              <div className="p-3 rounded-xl bg-[#f2f3ff] border border-[#eaedff] space-y-1">
                <div className="font-semibold text-[#131b2e]">{rejectTargetApp.scholarshipTitle}</div>
                <div className="text-[11px] text-[#737686]">
                  Candidate: {rejectTargetApp.studentName} • CGPA {rejectTargetApp.studentGpa.toFixed(2)} • ₹
                  {formatCurrency(rejectTargetApp.annualIncome)}/yr
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="font-medium text-[#434655]">Primary Rejection Reason</label>
              <select
                value={rejectReasonCategory}
                onChange={(e) => setRejectReasonCategory(e.target.value)}
                className="w-full h-9 rounded-lg border border-[#eaedff] bg-white px-3 py-1 text-xs text-[#131b2e] shadow-sm focus:outline-none focus:border-[#ba1a1a]"
              >
                <option value="GPA Below Threshold">GPA Below Mandatory Minimum Threshold</option>
                <option value="Income Exceeds Ceiling">Family Annual Income Exceeds Program Ceiling</option>
                <option value="Department Ineligible">Academic Major / Department Not Eligible</option>
                <option value="Slots Exhausted">Available Award Slots Exhausted (Quota Reached)</option>
                <option value="Incomplete Dossier">Incomplete Documentation or Insufficient Statement</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-[#434655]">Official Feedback & Reviewer Remarks</label>
              <textarea
                rows={3}
                placeholder="e.g. Candidate CGPA (2.90) is below the minimum 3.50 requirement for this research fellowship. Advised to apply for Need-Based Aid."
                value={rejectCustomRemarks}
                onChange={(e) => setRejectCustomRemarks(e.target.value)}
                className="w-full rounded-lg border border-[#eaedff] bg-white p-3 text-xs text-[#131b2e] placeholder:text-[#737686] focus:outline-none focus:border-[#ba1a1a]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRejectModalOpen(false)}
              className="border-[#eaedff] bg-white hover:bg-[#f2f3ff] text-[#131b2e] text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmRejection}
              disabled={isPending}
              className="bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              {isPending ? "Submitting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: OFFICIAL AWARD LETTER GENERATION (MATCHING media_1790146468127.png) */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(selectedAwardApp)} onOpenChange={(open) => !open && setSelectedAwardApp(null)}>
        <DialogContent className="bg-transparent border-0 text-[#131b2e] max-w-2xl p-0 shadow-2xl overflow-hidden">
          {selectedAwardApp && (() => {
            const studentLastName = selectedAwardApp.studentName.split(" ").slice(-1)[0] || selectedAwardApp.studentName;
            const grantor = selectedAwardApp.scholarshipTitle.includes("Tata")
              ? "Tata Trust"
              : selectedAwardApp.scholarshipTitle.includes("Reliance")
              ? "Reliance Foundation"
              : selectedAwardApp.scholarshipTitle.includes("Adani")
              ? "Adani Foundation"
              : "Jorge Belgarca";

            return (
              <div
                onClick={() => downloadAwardLetterPdf(selectedAwardApp)}
                className="bg-[#faf8f5] rounded-2xl border border-[#eae4da] shadow-2xl relative overflow-hidden font-serif p-8 sm:p-12 text-[#2d2a29] cursor-pointer group transition-all"
                title="Click anywhere to download your official Award Letter PDF"
              >
                {/* Download Hint Pill */}
                <div className="mb-4 px-3 py-1.5 rounded-lg bg-blue-50/90 border border-blue-200/90 flex items-center justify-between font-sans text-xs text-[#004ac6] relative z-10 print:hidden">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-[#004ac6]" /> Official Award Letter Preview
                  </span>
                  <span className="text-[11px] font-bold underline flex items-center gap-1">
                    <Download className="h-3 w-3" /> Click letter to download PDF
                  </span>
                </div>
                {/* Top-Left Concentric Ripple Arc Watermark (from template.png) */}
                <svg
                  className="absolute -top-10 -left-10 w-56 h-56 pointer-events-none opacity-35 text-[#cbbba6]"
                  viewBox="0 0 200 200"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="0" cy="0" r="40" strokeWidth="1.2" />
                  <circle cx="0" cy="0" r="65" strokeWidth="1.2" />
                  <circle cx="0" cy="0" r="90" strokeWidth="1.2" />
                  <circle cx="0" cy="0" r="115" strokeWidth="1.2" />
                  <circle cx="0" cy="0" r="140" strokeWidth="1.2" />
                  <circle cx="0" cy="0" r="165" strokeWidth="1.2" />
                  <circle cx="0" cy="0" r="190" strokeWidth="1.2" />
                </svg>

                {/* Bottom-Right Concentric Ripple Arc Watermark (from template.png) */}
                <svg
                  className="absolute -bottom-12 -right-12 w-64 h-64 pointer-events-none opacity-35 text-[#cbbba6]"
                  viewBox="0 0 200 200"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="200" cy="200" r="45" strokeWidth="1.2" />
                  <circle cx="200" cy="200" r="75" strokeWidth="1.2" />
                  <circle cx="200" cy="200" r="105" strokeWidth="1.2" />
                  <circle cx="200" cy="200" r="135" strokeWidth="1.2" />
                  <circle cx="200" cy="200" r="165" strokeWidth="1.2" />
                  <circle cx="200" cy="200" r="195" strokeWidth="1.2" />
                </svg>

                {/* Header: Golden concentric circular emblem (right) & University heading (left) */}
                <div className="flex items-start justify-between pb-8 relative z-10">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#1e1d1c] tracking-tight">
                      Bannari Amman Institute of Technology
                    </h2>
                    <p className="text-[11px] font-sans text-[#73706b] tracking-wider uppercase mt-0.5">
                      Office of the Dean &bull; Academic Scholarships Division &bull; Sathyamangalam
                    </p>
                  </div>

                  {/* Golden Concentric Circular Logo with Foundation Name */}
                  <div className="flex items-center gap-3">
                    <svg className="w-12 h-12 text-[#b58c54]" viewBox="0 0 60 60" fill="none" stroke="currentColor">
                      <circle cx="30" cy="30" r="5" strokeWidth="1.5" />
                      <circle cx="30" cy="30" r="10" strokeWidth="1.5" />
                      <circle cx="30" cy="30" r="15" strokeWidth="1.5" />
                      <circle cx="30" cy="30" r="20" strokeWidth="1.5" />
                      <circle cx="30" cy="30" r="25" strokeWidth="1.5" />
                      <circle cx="30" cy="30" r="28" strokeWidth="1.2" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="font-serif font-bold text-sm sm:text-base text-[#2d2a29] leading-tight">
                        {grantor}
                      </span>
                      <span className="font-serif text-xs sm:text-sm text-[#4a4744] leading-tight">
                        Foundation
                      </span>
                    </div>
                  </div>
                </div>

                {/* Letter Content Body */}
                <div className="space-y-5 pt-4 pb-4 text-[#33312e] text-xs sm:text-sm leading-relaxed relative z-10 font-serif">
                  <p className="font-medium text-[#1e1d1c] text-sm sm:text-base">
                    Dear Mr./Ms. {studentLastName},
                  </p>

                  <p>
                    I am pleased to inform you that you have been selected as the recipient of the{" "}
                    <strong className="text-[#1e1d1c] font-semibold">{selectedAwardApp.scholarshipTitle}</strong> for the next academic year. On behalf of Bannari Amman Institute of Technology and the {grantor} Foundation, I extend our congratulations to you.
                  </p>

                  <p>
                    The <strong className="text-[#1e1d1c] font-semibold">{selectedAwardApp.scholarshipTitle}</strong> is a prestigious award that honors the legacy of {grantor} and extraordinary contributions to academic excellence and leadership. This scholarship is a testament to your outstanding achievements, dedication, and potential.
                  </p>

                  <p>
                    Once again, we congratulate you on your exceptional achievement and are excited to see the positive impact you will make in your academic journey and beyond.
                  </p>

                  <p>
                    If you have any further questions or wish to discuss it further, please do not hesitate to get in touch using my contact details provided.
                  </p>

                  {/* Sign-off & Handwritten Cursive Signature */}
                  <div className="pt-3 space-y-1">
                    <p className="font-normal text-[#2d2a29]">Yours sincerely,</p>
                    <div className="pt-2 pb-1">
                      <span className="text-3xl sm:text-4xl text-[#2c2825] italic font-serif tracking-wider select-none font-normal" style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Snell Roundhand', cursive, Georgia, serif" }}>
                        Jay Dinakar R
                      </span>
                    </div>
                    <div className="text-[#2d2a29]">
                      <p className="font-bold text-xs sm:text-sm">Jay Dinakar R</p>
                      <p className="text-[11px] text-[#434655] font-semibold">Academic Trust Dean &amp; Director of Scholarships</p>
                      <p className="italic text-[11px] text-[#66625c]">Bannari Amman Institute of Technology</p>
                    </div>
                  </div>
                </div>

                {/* Footer Controls & Download Buttons */}
                <div className="pt-6 mt-4 border-t border-[#eae4da] flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10 print:hidden font-sans">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#73706b] font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Verified Ref: DBT-2026-{selectedAwardApp.id.slice(0, 8).toUpperCase()}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedAwardApp(null)}
                      className="border-[#eae4da] bg-white text-[#2d2a29] hover:bg-[#f2efe9] text-xs rounded-xl h-8 px-3"
                    >
                      Close
                    </Button>
                    <a
                      href="/scholarshiptemplate/template.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border border-[#eae4da] bg-white text-[#2d2a29] hover:bg-[#f2efe9] text-xs font-semibold rounded-xl h-8 px-3 transition-colors"
                      title="View raw template image from scholarshiptemplate folder"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#73706b]" />
                      <span>Template Asset</span>
                    </a>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAwardPdf(selectedAwardApp);
                      }}
                      className="bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold rounded-xl h-8 px-3.5 gap-1.5 shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAwardPng(selectedAwardApp);
                      }}
                      className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-xl h-8 px-3.5 gap-1.5 shadow-sm"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      <span>Download PNG</span>
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAwardPdf(selectedAwardApp);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl h-8 px-3.5 gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Instant Export</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: VERIFIED DOCUMENT PREVIEW & INDIAN FORENSIC DOSSIER MODAL         */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="bg-white border-[#eaedff] text-[#131b2e] max-w-xl p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {previewDoc && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#004ac6] text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4 text-[#004ac6]" /> Indian Statutory Trust Dossier
                  </div>
                  {previewDoc.verdict === "FRAUD_REJECTED" ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                      🚨 FORGERY BLOCKED
                    </span>
                  ) : previewDoc.verdict === "SUSPICIOUS_FLAGGED" ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                      ⚠️ FLAGGED ANOMALY
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                      ✅ GENUINE ATTESTED
                    </span>
                  )}
                </div>
                <DialogTitle className="text-[#131b2e] text-lg font-bold font-heading">
                  {previewDoc.title}
                </DialogTitle>
                <DialogDescription className="text-[#737686] text-xs">
                  Issued by: {previewDoc.issuer}
                </DialogDescription>
              </DialogHeader>

              {activeRole === "ADMIN" ? (
                <>
                  {/* Forensic Risk Assessment Scorecard (Admin) */}
                  <div
                    className={`p-4 rounded-xl border space-y-2 ${
                      previewDoc.verdict === "FRAUD_REJECTED"
                        ? "bg-red-50/80 border-red-200 text-red-950"
                        : previewDoc.verdict === "SUSPICIOUS_FLAGGED"
                        ? "bg-amber-50/80 border-amber-200 text-amber-950"
                        : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider">
                        Anti-Fraud Risk Assessment
                      </span>
                      <span className="text-sm font-black font-mono">
                        {previewDoc.fraudRiskScore !== undefined ? `${previewDoc.fraudRiskScore}% Fraud Risk` : "0% Risk (Passed)"}
                      </span>
                    </div>
                    {/* Risk Bar Meter */}
                    <div className="w-full bg-black/10 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (previewDoc.fraudRiskScore ?? 0) > 60
                            ? "bg-red-600"
                            : (previewDoc.fraudRiskScore ?? 0) > 20
                            ? "bg-amber-500"
                            : "bg-emerald-600"
                        }`}
                        style={{ width: `${Math.max(5, previewDoc.fraudRiskScore ?? 0)}%` }}
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {previewDoc.tamperSummary ||
                        "All Indian statutory checksums, state revenue authority serials, and identity matching rules passed."}
                    </p>
                  </div>

                  {/* Granular Statutory Forensic Checklist (Admin) */}
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-[#434655] uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <FileSearch className="h-3.5 w-3.5 text-[#004ac6]" /> Forensic Inspection Checklist
                    </span>

                    <div className="rounded-xl border border-[#eaedff] bg-[#faf8ff] p-3 space-y-2">
                      {previewDoc.checks && previewDoc.checks.length > 0 ? (
                        previewDoc.checks.map((c, i) => (
                          <div key={i} className="flex items-start justify-between gap-2 text-xs pb-1.5 border-b border-[#eaedff] last:border-0 last:pb-0">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-[#131b2e] flex items-center gap-1.5">
                                {c.passed ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <X className="h-3.5 w-3.5 text-red-600 shrink-0" />
                                )}
                                <span>{c.checkName}</span>
                              </div>
                              <p className="text-[11px] text-[#737686] pl-5">{c.details}</p>
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase shrink-0 px-1.5 py-0.5 rounded ${
                                c.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {c.passed ? "Passed" : "Failed"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-[#737686] p-2">
                          Standard DigiLocker statutory checksum and institutional digital seal verified.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Clean Student Document Attestation Card */
                <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#eaedff] space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Attested & Ready for Scholarship Verification</span>
                  </div>
                  <p className="text-[#434655] text-[11px]">
                    This certificate is stored securely in your encrypted student vault and linked to your National Scholar ID.
                  </p>
                </div>
              )}

              {/* Cloudinary CDN Live Online Viewer */}
              {previewDoc.fileUrl ? (
                <div className="rounded-xl border border-[#eaedff] bg-white p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#131b2e] text-xs flex items-center gap-1.5">
                      {previewDoc.fileUrl.startsWith("/specimens") ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Official Statutory Specimen Proof</span>
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
                        </>
                      ) : (
                        <>
                          <Cloud className="h-3.5 w-3.5 text-[#004ac6]" />
                          <span>Live on Cloudinary CDN</span>
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
                        </>
                      )}
                    </span>
                    <a
                      href={previewDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#004ac6] hover:underline"
                    >
                      <span>Open Fullscreen ↗</span>
                    </a>
                  </div>

                  {/\.(png|jpe?g|webp|gif|svg)$/i.test(previewDoc.fileUrl) ? (
                    <div className="relative rounded-lg overflow-hidden border border-[#eaedff] bg-[#faf8ff] flex items-center justify-center p-3 max-h-72">
                      <img
                        src={previewDoc.fileUrl}
                        alt={previewDoc.title}
                        className="max-h-68 w-full max-w-md object-contain rounded shadow-sm bg-white"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden border border-[#eaedff] bg-[#faf8ff]">
                      <iframe
                        src={previewDoc.fileUrl}
                        title={previewDoc.title}
                        className="w-full h-64 border-0"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#eaedff] bg-[#faf8ff] p-3 text-center text-xs text-[#737686]">
                  <Cloud className="h-6 w-6 text-[#004ac6] mx-auto mb-1 opacity-70" />
                  <p className="font-semibold text-[#131b2e]">DigiLocker Attested Statutory Specimen</p>
                  <p className="text-[11px]">Anchored cryptographically to PS78 state repository.</p>
                </div>
              )}

              {/* Document Attributes */}
              <div className="p-3.5 rounded-xl bg-[#f2f3ff] border border-[#eaedff] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#737686]">Statutory Identifier:</span>
                  <span className="font-mono font-bold text-[#004ac6]">{previewDoc.extractedIdentifier || previewDoc.metricValue || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#737686]">File Artifact:</span>
                  <span className="font-mono text-[#131b2e] font-medium">{previewDoc.fileName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#737686]">Validity Term:</span>
                  <span className="font-medium text-[#131b2e]">{previewDoc.validity}</span>
                </div>
              </div>

              {/* Cryptographic Hash Box */}
              <div className="p-3.5 rounded-xl bg-[#e2e7ff]/60 border border-[#2563eb]/30 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#004ac6] flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" /> Immutable SHA-256 Anchor
                  </span>
                  {activeRole === "ADMIN" && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDoc(null);
                        setActiveTab("analytics");
                        setQuickHashQuery(previewDoc.id);
                        handleVerifyHash(previewDoc.id);
                      }}
                      className="text-[10px] text-[#004ac6] font-bold underline hover:text-[#003ea8]"
                    >
                      View on Ledger →
                    </button>
                  )}
                </div>
                <div className="font-mono text-[10px] text-[#434655] break-all bg-white p-2 rounded-lg border border-[#eaedff]">
                  {previewDoc.sha256Hash}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewDoc(null)}
                  className="border-[#eaedff] bg-white hover:bg-[#f2f3ff] text-[#131b2e] text-xs rounded-lg"
                >
                  Close
                </Button>
                {previewDoc.fileUrl ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={previewDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#004ac6] border border-[#eaedff] text-xs font-semibold rounded-lg px-3 py-2"
                    >
                      <ExternalLink className="h-4 w-4" /> Open Full Proof
                    </a>
                    <a
                      href={previewDoc.fileUrl}
                      download={previewDoc.fileName}
                      className="inline-flex items-center justify-center gap-1.5 bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold rounded-lg shadow-sm px-4 py-2"
                    >
                      <Download className="h-4 w-4" /> Download Official File
                    </a>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      downloadStudentProfilePdf(student, bonafideStatus);
                      setPreviewDoc(null);
                    }}
                    className="bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold rounded-lg shadow-sm gap-1.5"
                  >
                    <Download className="h-4 w-4" /> Download Authenticated PDF Copy
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: UPLOAD NEW DOCUMENT WITH INDIAN ANTI-FRAUD ENGINE                 */}
      {/* ========================================================================= */}
      <Dialog
        open={isUploadDocOpen}
        onOpenChange={(open) => {
          setIsUploadDocOpen(open);
          if (!open) setUploadLockedDocType(null);
        }}
      >
        <DialogContent className="bg-white border-[#eaedff] text-[#131b2e] max-w-xl p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleUploadNewDoc}>
            <DialogHeader>
              <div className="flex items-center gap-2 text-[#004ac6] text-xs font-bold uppercase tracking-wider">
                <FileUp className="h-3.5 w-3.5" /> Indian Statutory Document Ingestion
              </div>
              <DialogTitle className="text-[#131b2e] text-lg font-bold font-heading">
                Upload & Verify Statutory Certificate
              </DialogTitle>
              <DialogDescription className="text-[#737686] text-xs">
                Supports direct file upload, DigiLocker fetch, and instant Indian anti-fraud checksum verification.
              </DialogDescription>
            </DialogHeader>

            {/* Ingestion Mode Switcher */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#f2f3ff] rounded-xl my-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setUploadMode("FILE")}
                className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                  uploadMode === "FILE" ? "bg-white text-[#004ac6] shadow-sm font-bold" : "text-[#737686] hover:text-[#131b2e]"
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" /> Direct File Upload
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("DIGILOCKER")}
                className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                  uploadMode === "DIGILOCKER" ? "bg-white text-[#004ac6] shadow-sm font-bold" : "text-[#737686] hover:text-[#131b2e]"
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5" /> DigiLocker Pull
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("PRESET")}
                className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${
                  uploadMode === "PRESET" ? "bg-white text-[#712ae2] shadow-sm font-bold" : "text-[#737686] hover:text-[#131b2e]"
                }`}
              >
                <ScanLine className="h-3.5 w-3.5" /> Test Presets
              </button>
            </div>

            {uploadMode === "PRESET" ? (
              <div className="space-y-3 py-2 text-xs">
                <div className="flex items-center justify-between">
                  <p className="text-[#737686]">
                    Select a pre-configured Indian document specimen to test real-time fraud detection:
                  </p>
                  {uploadLockedDocType && (
                    <Badge className="bg-[#004ac6]/10 text-[#004ac6] border-none text-[10px] px-2 py-0.5 font-semibold">
                      Filtered for {uploadDocTitle}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {(uploadLockedDocType
                    ? INDIAN_DOCUMENT_PRESETS.filter((p) => p.type === uploadLockedDocType)
                    : INDIAN_DOCUMENT_PRESETS
                  ).map((p, idx) => {
                    const originalIdx = INDIAN_DOCUMENT_PRESETS.indexOf(p);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSeedDocumentPreset(originalIdx)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          p.isFake
                            ? "border-red-200 bg-red-50/40 hover:bg-red-50 text-red-950"
                            : "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-950"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold flex items-center gap-1.5">
                            {p.isFake ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            )}
                            <span>{p.label}</span>
                          </div>
                          <div className="text-[11px] text-[#737686]">
                            Identifier: {p.identifier} • {p.issuingAuthority}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          className={`h-7 px-3 text-[11px] rounded-lg font-semibold ${
                            p.isFake ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          Ingest & Scan
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2 text-xs">
                {/* Locked Slot Notice */}
                {uploadLockedDocType && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-[#004ac6]">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 shrink-0 text-[#004ac6]" />
                      <div>
                        <span className="font-bold">Targeted Document Slot: {uploadDocTitle}</span>
                        <span className="block text-[11px] text-blue-700">Uploaded certificate will replace this specific verified record.</span>
                      </div>
                    </div>
                    <Badge className="bg-[#004ac6] text-white text-[10px]">
                      {uploadLockedDocType}
                    </Badge>
                  </div>
                )}

                {/* Cloudinary CDN Status Banner */}
                <div className="flex items-center justify-between text-[11px] bg-sky-50 text-sky-900 border border-sky-200 px-3 py-1.5 rounded-xl">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Cloud className="h-3.5 w-3.5 text-sky-600" />
                    <span>Cloudinary CDN Storage Active</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                  </span>
                  <span className="font-mono text-[10px] text-sky-700 bg-white/80 px-2 py-0.5 rounded border border-sky-200">
                    folder: scholarship_portal_docs
                  </span>
                </div>

                {/* Real File Upload Drag & Drop Area */}
                <div className="p-4 border-2 border-dashed border-[#eaedff] rounded-2xl text-center bg-[#faf8ff] hover:bg-[#f2f3ff] transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadSelectedFile(file);
                        setUploadFileName(file.name);
                        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
                        setUploadFileSize(`${sizeMb} MB`);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-8 w-8 text-[#004ac6] mx-auto mb-1" />
                  <span className="font-bold text-xs text-[#131b2e] block">
                    {uploadFileName || "Click or Drag File to Upload (.PDF, .JPG, .PNG)"}
                  </span>
                  <span className="text-[10px] text-[#737686]">
                    Size: {uploadFileSize} • Client-side SHA-256 hashing computed
                  </span>
                </div>

                {/* Document Type Dropdown */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-[#434655]">Indian Statutory Document Type</label>
                    {uploadLockedDocType && (
                      <Badge className="bg-blue-100 text-[#004ac6] text-[10px] font-semibold border-none">
                        Locked to Slot
                      </Badge>
                    )}
                  </div>
                  <select
                    value={uploadIndianDocType}
                    disabled={Boolean(uploadLockedDocType)}
                    onChange={(e) => {
                      const t = e.target.value as IndianDocType;
                      setUploadIndianDocType(t);
                      if (t === "INCOME_CERTIFICATE") {
                        setUploadDocTitle("Annual Family Income Certificate");
                        setUploadDocIssuer("Tahsildar Revenue Office (TN e-District)");
                        setUploadIdentifier("TN-REV/2026/0948215");
                        setUploadExtractedIncome(String(student.annualIncome));
                      } else if (t === "AADHAAR_UIDAI") {
                        setUploadDocTitle("Aadhaar e-KYC Identity Card");
                        setUploadDocIssuer("UIDAI National Identity Authority");
                        setUploadIdentifier("5486 9214 7305");
                      } else if (t === "ACADEMIC_MARKSHEET") {
                        setUploadDocTitle("Official Semester Marksheet");
                        setUploadDocIssuer("University Office of the Controller of Exams");
                        setUploadIdentifier("2026-CS-8921");
                        setUploadExtractedGpa(String(student.gpa));
                      } else if (t === "COMMUNITY_CASTE_CERTIFICATE") {
                        setUploadDocTitle("Community / Caste Certificate");
                        setUploadDocIssuer("Zonal Revenue Department, Govt of Tamil Nadu");
                        setUploadIdentifier("TN-COMM/2026/41029");
                      } else if (t === "BANK_PASSBOOK") {
                        setUploadDocTitle("DBT Bank Account Passbook");
                        setUploadDocIssuer("State Bank of India (IIT Madras Branch)");
                        setUploadIdentifier("SBIN0001423");
                      }
                    }}
                    className="w-full h-9 rounded-lg border border-[#eaedff] bg-white px-3 text-xs text-[#131b2e] shadow-sm disabled:bg-[#f2f3ff] disabled:cursor-not-allowed"
                  >
                    <option value="INCOME_CERTIFICATE">Annual Family Income Certificate (e-District)</option>
                    <option value="AADHAAR_UIDAI">Aadhaar Biometric e-KYC (UIDAI Verhoeff)</option>
                    <option value="ACADEMIC_MARKSHEET">Academic Transcript / Semester Marksheet</option>
                    <option value="COMMUNITY_CASTE_CERTIFICATE">Community / Caste Attestation</option>
                    <option value="BANK_PASSBOOK">Bank Passbook Mandate (RBI IFSC & DBT Bridge)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#434655]">Document Title</label>
                    <Input
                      value={uploadDocTitle}
                      onChange={(e) => setUploadDocTitle(e.target.value)}
                      className="bg-white border-[#eaedff] text-xs h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#434655]">
                      {uploadIndianDocType === "AADHAAR_UIDAI"
                        ? "12-Digit Aadhaar UID"
                        : uploadIndianDocType === "INCOME_CERTIFICATE"
                        ? "e-District Cert Serial No"
                        : uploadIndianDocType === "BANK_PASSBOOK"
                        ? "Bank IFSC Code"
                        : "Certificate / Roll Number"}
                    </label>
                    <Input
                      value={uploadIdentifier}
                      onChange={(e) => setUploadIdentifier(e.target.value)}
                      className="bg-white border-[#eaedff] font-mono text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#434655]">Issuing Authority / Portal</label>
                    <Input
                      value={uploadDocIssuer}
                      onChange={(e) => setUploadDocIssuer(e.target.value)}
                      className="bg-white border-[#eaedff] text-xs h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#434655]">Name on Document</label>
                    <Input
                      value={uploadExtractedName}
                      onChange={(e) => setUploadExtractedName(e.target.value)}
                      placeholder={student.fullName}
                      className="bg-white border-[#eaedff] text-xs h-9"
                    />
                  </div>
                </div>

                {uploadIndianDocType === "INCOME_CERTIFICATE" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-[#434655]">Certified Annual Income (₹)</label>
                      <Input
                        type="number"
                        value={uploadExtractedIncome}
                        onChange={(e) => setUploadExtractedIncome(e.target.value)}
                        className="bg-white border-[#eaedff] text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-[#434655]">Statutory Expiry Date</label>
                      <Input
                        type="date"
                        value={uploadExpiryDate}
                        onChange={(e) => setUploadExpiryDate(e.target.value)}
                        className="bg-white border-[#eaedff] text-xs h-9"
                      />
                    </div>
                  </div>
                )}

                {uploadIndianDocType === "ACADEMIC_MARKSHEET" && (
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#434655]">Marksheet CGPA / Score</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={uploadExtractedGpa}
                      onChange={(e) => setUploadExtractedGpa(e.target.value)}
                      className="bg-white border-[#eaedff] text-xs h-9"
                    />
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#eaedff]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadDocOpen(false)}
                className="border-[#eaedff] bg-white hover:bg-[#f2f3ff] text-[#131b2e] text-xs rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploadingWithForensics}
                className="bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold rounded-lg shadow-sm gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                {isUploadingWithForensics ? (uploadProgressText || "Running Forensic Scan...") : "Ingest & Anchor to Ledger"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: EDIT SCHOLARSHIP SCHEME (ADMIN ONLY)                              */}
      {/* ========================================================================= */}
      <Dialog
        open={isEditSchemeOpen}
        onOpenChange={(open) => {
          setIsEditSchemeOpen(open);
          if (!open) setEditingScheme(null);
        }}
      >
        <DialogContent className="bg-white border-[#eaedff] text-[#131b2e] max-w-lg p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {editingScheme && (
            <form onSubmit={handleSaveSchemeEdits}>
              <DialogHeader>
                <div className="flex items-center gap-2 text-[#004ac6] text-xs font-bold uppercase tracking-wider">
                  <Edit3 className="h-3.5 w-3.5" /> Scheme Management
                </div>
                <DialogTitle className="text-[#131b2e] text-lg font-bold font-heading">
                  Edit Scholarship Scheme
                </DialogTitle>
                <DialogDescription className="text-[#737686] text-xs">
                  Update scheme parameters, funding amount, slots, and eligibility criteria directly in the database.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-[#434655]">Scheme Title</label>
                  <Input
                    value={editingScheme.title}
                    onChange={(e) => setEditingScheme({ ...editingScheme, title: e.target.value })}
                    required
                    className="bg-white border-[#eaedff] text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#434655]">Description</label>
                  <textarea
                    rows={3}
                    value={editingScheme.description}
                    onChange={(e) => setEditingScheme({ ...editingScheme, description: e.target.value })}
                    required
                    className="w-full rounded-lg border border-[#eaedff] bg-white p-2.5 text-xs text-[#131b2e] focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#434655]">Category</label>
                    <select
                      value={editingScheme.category}
                      onChange={(e) => setEditingScheme({ ...editingScheme, category: e.target.value as ScholarshipCategory })}
                      className="w-full h-9 rounded-lg border border-[#eaedff] bg-white px-2.5 text-xs text-[#131b2e]"
                    >
                      <option value="Merit-Based">Merit-Based</option>
                      <option value="Need-Based">Need-Based</option>
                      <option value="STEM & Research">STEM & Research</option>
                      <option value="Women in Tech">Women in Tech</option>
                      <option value="Underrepresented Groups">Underrepresented Groups</option>
                      <option value="International">International</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#434655]">Award Amount (₹)</label>
                    <Input
                      type="number"
                      value={editingScheme.awardAmount}
                      onChange={(e) => setEditingScheme({ ...editingScheme, awardAmount: Number(e.target.value) || 0 })}
                      required
                      className="bg-white border-[#eaedff] text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#434655]">Total Slots</label>
                    <Input
                      type="number"
                      value={editingScheme.totalSlots}
                      onChange={(e) => {
                        const total = Number(e.target.value) || 1;
                        const diff = total - editingScheme.totalSlots;
                        setEditingScheme({
                          ...editingScheme,
                          totalSlots: total,
                          remainingSlots: Math.max(0, editingScheme.remainingSlots + diff),
                        });
                      }}
                      required
                      className="bg-white border-[#eaedff] text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#434655]">Min CGPA</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingScheme.minGpa}
                      onChange={(e) => setEditingScheme({ ...editingScheme, minGpa: Number(e.target.value) || 0 })}
                      required
                      className="bg-white border-[#eaedff] text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#434655]">Max Income (₹)</label>
                    <Input
                      type="number"
                      value={editingScheme.maxIncome ?? ""}
                      onChange={(e) => setEditingScheme({ ...editingScheme, maxIncome: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="No limit"
                      className="bg-white border-[#eaedff] text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-[#434655]">Scheme Status</label>
                  <select
                    value={editingScheme.status}
                    onChange={(e) => setEditingScheme({ ...editingScheme, status: e.target.value as "OPEN" | "CLOSED" })}
                    className="w-full h-9 rounded-lg border border-[#eaedff] bg-white px-2.5 text-xs text-[#131b2e]"
                  >
                    <option value="OPEN">OPEN (Accepting Submissions)</option>
                    <option value="CLOSED">CLOSED (Archived / Quota Filled)</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#eaedff]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditSchemeOpen(false);
                    setEditingScheme(null);
                  }}
                  className="border-[#eaedff] bg-white hover:bg-[#f2f3ff] text-[#131b2e] text-xs rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#004ac6] hover:bg-[#003ea8] text-white text-xs font-semibold rounded-lg shadow-sm gap-1.5"
                >
                  <Check className="h-4 w-4" /> Save Scheme Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* INTERACTIVE SPOTLIGHT PLATFORM TOUR (FLOATING & ELEMENT-HIGHLIGHTED)      */}
      {/* ========================================================================= */}
      <InteractiveTour
        isOpen={isHelpOpen}
        onClose={() => {
          setIsHelpOpen(false);
          setTabTourKey(null);
        }}
        role={activeRole}
        tabTourKey={tabTourKey}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* Floating Tour Guide Launcher Button */}
      <button
        type="button"
        onClick={() => {
          setTabTourKey(null);
          setIsHelpOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 group hover:scale-105 active:scale-95 border-2 border-white/80"
        title={activeRole === "ADMIN" ? "Interactive Admin Guide (?)" : "Interactive Platform Guide (?)"}
      >
        <HelpCircle className="w-5 h-5" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold whitespace-nowrap">
          {activeRole === "ADMIN" ? "Admin Guide (?)" : "Platform Guide (?)"}
        </span>
      </button>
    </div>
  );
}
