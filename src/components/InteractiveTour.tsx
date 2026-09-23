"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";

export interface TourStep {
  targetId: string;
  tabKey?: string;
  tag: string;
  title: string;
  desc: string;
  highlights?: string[];
  preferredPlacement?: "bottom" | "top" | "left" | "right";
}

// =========================================================================
// 1. OVERALL STUDENT ONBOARDING & NAVIGATION TOUR
// =========================================================================
export const STUDENT_TOUR_STEPS: TourStep[] = [
  {
    targetId: "tour-top-header",
    tag: "STUDENT WORKSPACE",
    title: "Your Portal Header & Identity",
    desc: "This header shows your active student profile, real-time DigiLocker sync status, and instant search across all national scholarships.",
    highlights: [
      "DigiLocker & UIDAI e-KYC sync status verified.",
      "1-Click Sync to refresh active grant quotas and disbursement states.",
      "Notification bell alerts you to urgent document renewals & award letters.",
    ],
    preferredPlacement: "bottom",
  },
  {
    targetId: "tour-sidebar-nav",
    tag: "STUDENT NAVIGATION",
    title: "Move Between Student Tools",
    desc: "Use this navigation to seamlessly explore scholarship schemes, manage encrypted documents, track application dossiers, and view the public blockchain ledger.",
    highlights: [
      "Dashboard: Academic standing overview & dynamic AI match scores.",
      "Scholarships: Central catalog with strict CGPA filtering.",
      "Document Vault: 6 central statutory certificates with authentic specimens.",
      "My Applications: Milestone timeline & authenticated award letters.",
    ],
    preferredPlacement: "right",
  },
  {
    targetId: "tour-profile-stats",
    tabKey: "dashboard",
    tag: "ELIGIBILITY & CLEARANCE",
    title: "Track Verification & 100% All Clear",
    desc: "These quick indicators display your verified academic standing, family income attestation, and institutional bonafide clearance.",
    highlights: [
      "100% All Clear: Institutional Bonafide verifies 100% profile completeness.",
      "Academic Merit: 3.92 CGPA verified against university registrar records.",
      "Cryptographic Checksums: Verhoeff D5 algorithm prevents certificate forgery.",
    ],
    preferredPlacement: "bottom",
  },
  {
    targetId: "tour-scholarships-catalog",
    tabKey: "scholarships",
    tag: "SCHOLARSHIP CATALOG",
    title: "Scholarship Catalog & Strict CGPA Guard",
    desc: "Explore active Central, State, and Corporate Endowment scholarships. If your CGPA does not meet the minimum requirement, applications are strictly blocked.",
    highlights: [
      "Strict CGPA Guard: Displays 'You Are Not Eligible' and blocks submission.",
      "Smart Auto-Fill: Pre-populates 85% of your application from verified records.",
      "Live Quota Counters: Real-time tracking of remaining sponsored seats.",
    ],
    preferredPlacement: "bottom",
  },
  {
    targetId: "tour-document-vault",
    tabKey: "documents",
    tag: "STATUTORY VAULT",
    title: "Encrypted Document Vault & DigiLocker",
    desc: "Your encrypted depository for all 6 statutory certificates needed for central scholarship disbursements.",
    highlights: [
      "All 6 Documents: Aadhaar, Marksheets, Bonafide, Income, Caste, and Passbook.",
      "Zero-Latency Inspection: View authentic verified specimens instantly.",
      "Dedicated Replacement: Uploading locks directly into its dedicated slot.",
    ],
    preferredPlacement: "bottom",
  },
  {
    targetId: "tour-my-applications",
    tabKey: "my-applications",
    tag: "APPLICATION DOSSIERS",
    title: "Application Dossiers & Sanction Letters",
    desc: "Track your submission from initial committee screening to registrar approval and PFMS DBT bank transfer.",
    highlights: [
      "Milestone Timeline: Follow real-time committee reviews and merit scoring.",
      "Official Award Letters: Download official sanction letters with QR verification.",
      "Signatory Attestation: Formally signed by Jay Dinakar R, Director of Academic Trust.",
    ],
    preferredPlacement: "bottom",
  },
];

// =========================================================================
// 2. OVERALL ADMINISTRATOR & COMMITTEE CHAIR TOUR
// =========================================================================
export const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    targetId: "tour-top-header",
    tag: "ADMIN CONTROL CENTER",
    title: "Administrator Header & Unified Search",
    desc: "This executive header provides instant search across candidate dossiers, scholarship schemes, and real-time database synchronization.",
    highlights: [
      "Multi-Entity Search: Look up applicants, scheme IDs, roll numbers, or disbursement UTRs.",
      "Sync Engine: Re-computes quota capacity, budget utilization, and pending committee queues.",
      "Committee Chairperson Identity: Operating under authorized institutional credentials.",
    ],
    preferredPlacement: "bottom",
  },
  {
    targetId: "tour-admin-sidebar-nav",
    tag: "ADMIN NAVIGATION",
    title: "Administrative Operations Menu",
    desc: "Manage all operations through dedicated modules: Executive Overview, Evaluation & Verification Center, Scheme Rule Engine, and Public Blockchain Ledger.",
    highlights: [
      "Admin Overview: Macro metrics on total sanctions, fund disbursals, and scheme capacity.",
      "Applications Review: Multi-criteria evaluation, merit scoring, and approval workflows.",
      "Manage Schemes: Configure quota rules, CGPA thresholds, and departmental eligibility.",
      "Audit Ledger & DBT: Immutable cryptographic verification and statutory compliance packs.",
    ],
    preferredPlacement: "right",
  },
  {
    targetId: "tour-admin-overview-stats",
    tabKey: "admin-overview",
    tag: "EXECUTIVE ANALYTICS",
    title: "Operations Overview & Fund Disbursals",
    desc: "Live analytics displaying total scholarship capital sanctioned, seat utilization rates, and active submission velocity across all university departments.",
    highlights: [
      "Live KPI Counters: Real-time tracking of sanctioned funds (₹) and remaining capacity.",
      "1-Click Seed Simulator: Test new corporate or endowment fellowship scenarios safely.",
      "Direct Scheme Creation: Launch central government or private trust schemes instantly.",
    ],
    preferredPlacement: "bottom",
  },
  {
    targetId: "tour-admin-app-review",
    tabKey: "applications-review",
    tag: "EVALUATION CENTER",
    title: "Evaluation & Verification Workspace",
    desc: "Review candidate dossiers, inspect DigiLocker credential forensics, assign merit scores, and issue formal sanctions or categorized statutory rejections.",
    highlights: [
      "Multi-Filter Pipeline: Filter by Status (Pending, Under Review, Approved, Rejected).",
      "Statutory Rejection Engine: Assign formal rejection reasons with mandatory 14-day appeal notices.",
      "Automated Sanctions: Triggers direct NPCI mapper electronic DBT fund transfers.",
    ],
    preferredPlacement: "bottom",
  },
  {
    targetId: "tour-admin-manage-schemes",
    tabKey: "manage-schemes",
    tag: "SCHEME GOVERNANCE",
    title: "Scheme Rules & Strict CGPA Configuration",
    desc: "Create and calibrate scholarship schemes. Enforce strict minimum CGPA cutoffs, annual family income ceilings, and departmental seat quotas.",
    highlights: [
      "Strict CGPA Guardrail: Define threshold (e.g. 3.75 CGPA) that strictly gates student eligibility.",
      "Income Ceiling & Quotas: Automatically validate candidate financial need via tahsildar records.",
      "Lifecycle Controls: Toggle schemes between OPEN, CLOSED, and ARCHIVED states.",
    ],
    preferredPlacement: "bottom",
  },
  {
    targetId: "tour-admin-audit-ledger",
    tabKey: "analytics",
    tag: "BLOCKCHAIN & COMPLIANCE",
    title: "Cryptographic Ledger & 1-Click ZIP Audit Pack",
    desc: "Verify immutable transaction hashes anchored to the SHA-256 Merkle chain. Validate zero-leakage Direct Benefit Transfers and export statutory compliance bundles.",
    highlights: [
      "Immutable Audit Ledger: Every sanction and disbursement is cryptographically chained.",
      "Anti-Fraud Checksums: Verhoeff Dihedral D5 and AES-256 tokenization validation.",
      "1-Click ZIP Audit Pack: Exports complete CSV data, JSON ledger, and statutory report bundle.",
    ],
    preferredPlacement: "bottom",
  },
];

// =========================================================================
// 3. TAB-SPECIFIC TOURS (FOR DEDICATED PER-TAB "GUIDE (?)" BUTTONS)
// =========================================================================
export const TAB_SPECIFIC_TOURS: Record<string, TourStep[]> = {
  // STUDENT TABS:
  dashboard: [
    {
      targetId: "tour-profile-stats",
      tabKey: "dashboard",
      tag: "DASHBOARD OVERVIEW",
      title: "100% All Clear & Academic Verification",
      desc: "Monitors your profile completeness, CGPA standing authenticated against registrar records, and bonafide clearance.",
      highlights: [
        "100% All Clear: Institutional Bonafide verifies complete profile status.",
        "Verified CGPA: 3.92 CGPA authenticated against Anna University records.",
        "Verhoeff D5 Checksum: Cryptographic verification protects against data tampering.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-dashboard-actions",
      tabKey: "dashboard",
      tag: "DIRECT ACTIONS",
      title: "One-Click Sync & Quick Discovery",
      desc: "Instantly synchronize student records with central university databases and browse qualified schemes.",
      highlights: [
        "1-Click Sync: Pulls real-time academic records and attendance markers.",
        "Direct Navigation: Jump straight to high-match scholarships with one click.",
      ],
      preferredPlacement: "bottom",
    },
  ],

  scholarships: [
    {
      targetId: "tour-scholarships-catalog",
      tabKey: "scholarships",
      tag: "SCHEME DISCOVERY",
      title: "Search, Categorize & Filter Scholarships",
      desc: "Browse through available Central, State, and Corporate Endowment schemes. Filter by category, open quota status, or Smart Match score.",
      highlights: [
        "Category Filters: STEM & Research, Financial Need, Academic Merit, and Diversity.",
        "Smart Match: AI-powered ranking based on student profile and qualification parameters.",
        "Live Seat Availability: Tracks remaining seats and application deadlines in real time.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-scholarships-cgpa-guard",
      tabKey: "scholarships",
      tag: "STRICT ELIGIBILITY",
      title: "Strict CGPA Requirement Guardrail",
      desc: "The system enforces statutory merit thresholds. If a student's CGPA is below the scheme cutoff, application is strictly blocked.",
      highlights: [
        "Eligibility Enforcement: Instantly alerts 'You Are Not Eligible' if CGPA is below cutoff.",
        "No False Submissions: Prevents invalid applications from clogging review queues.",
        "Merit Transparency: Explicitly displays minimum required CGPA vs your verified 3.92 CGPA.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-scholarships-apply-card",
      tabKey: "scholarships",
      tag: "ONE-CLICK APPLY",
      title: "Smart Pre-filled Application Dossier",
      desc: "Eligible students can apply instantly. 85% of required personal, academic, and banking information is pre-filled from verified records.",
      highlights: [
        "85% Auto-Filled: Eliminates redundant data entry using DigiLocker records.",
        "Document Attachment: Automatically links statutory certificates from your vault.",
        "Instant Receipt: Generates Form PS78-ACK submission acknowledgment PDF.",
      ],
      preferredPlacement: "bottom",
    },
  ],

  documents: [
    {
      targetId: "tour-document-vault",
      tabKey: "documents",
      tag: "STATUTORY VAULT",
      title: "Encrypted Document Depository",
      desc: "Centralized digital repository housing all 6 mandatory statutory certificates for government DBT scholarship verification.",
      highlights: [
        "6 Certificates: Aadhaar, 10th/12th Marksheet, Bonafide, Income, Caste, Passbook.",
        "DigiLocker v2.4 Integration: Real-time API synchronization with government issuance authorities.",
        "Tamper Detection: SHA-256 hash checks verify each document's digital signature.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-docs-specimen-grid",
      tabKey: "documents",
      tag: "DOCUMENT INSPECTION",
      title: "Zero-Latency Specimen Preview & Inspection",
      desc: "Inspect high-fidelity authentic specimen documents directly inside the portal without external viewers or file corruption.",
      highlights: [
        "Instant Vector & Image Previews: Fast interactive lightbox for credential scrutiny.",
        "Official Stamps & Seals: Verifiable institutional watermarks and QR codes.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-docs-upload-slot",
      tabKey: "documents",
      tag: "SLOT REPLACEMENT",
      title: "Dedicated Slot File Upload & 100% Attestation",
      desc: "Easily replace or update any certificate. Uploading a verified Bonafide Certificate automatically boosts profile strength from 90% to 100% All Clear.",
      highlights: [
        "Slot-Specific Upload: Replaces only the selected certificate without affecting others.",
        "100% All Clear Trigger: Immediately unlocks full eligibility across all schemes.",
      ],
      preferredPlacement: "bottom",
    },
  ],

  "my-applications": [
    {
      targetId: "tour-my-applications",
      tabKey: "my-applications",
      tag: "APPLICATION TRACKER",
      title: "Application Pipeline & Milestone Tracker",
      desc: "Track every submission in real time from initial screening to committee merit evaluation, approval, and DBT bank credit.",
      highlights: [
        "Live Status Pills: Pending, Under Review, Approved, or Rejected.",
        "Milestone Timeline: Date-stamped audit trail of institutional reviews.",
        "Aadhaar-Seeded DBT: Direct NPCI bridge confirms electronic fund transfers.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-apps-award-letter",
      tabKey: "my-applications",
      tag: "OFFICIAL SANCTIONS",
      title: "Authentic Award Letter Download (PDF & PNG)",
      desc: "Download official scholarship award letters with formal foundation borders, grant reference IDs, QR verification, and executive signatures.",
      highlights: [
        "Real File Downloads: Generates standalone Vector PDF and 1200x1700 Retina PNG.",
        "Executive Signature: Formally certified by Jay Dinakar R, Director of Academic Trust.",
        "QR Code Verification: Scan to verify authenticity against the blockchain ledger.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-apps-rejection-appeal",
      tabKey: "my-applications",
      tag: "STATUTORY APPEALS",
      title: "Rejection Notice & Form PS78-REV Appeal",
      desc: "Transparent grievance mechanism. Rejected applicants can download the official Form PS78-REV Statutory Appeal Memorandum within 14 days.",
      highlights: [
        "Clear Rejection Reasons: Specific categorization (e.g. Income Above Ceiling, Quota Exhausted).",
        "Form PS78-REV Download: Official appeal memorandum for registrar review.",
      ],
      preferredPlacement: "bottom",
    },
  ],

  profile: [
    {
      targetId: "tour-profile-hero",
      tabKey: "profile",
      tag: "VERIFIED DOSSIER",
      title: "Student Identity & Academic Credentials",
      desc: "Official institutional profile verified via Anna University records, DigiLocker, and UIDAI Aadhaar e-KYC.",
      highlights: [
        "Academic Standing: 3.92 CGPA in Computer Science & Engineering (2nd Year).",
        "DBT Integration: Active NPCI Aadhaar-seeded bank account for zero-leakage transfers.",
        "100% All Clear Status: Bonafide certificate verified by Dean of Academics.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-profile-download-actions",
      tabKey: "profile",
      tag: "DOSSIER EXPORT",
      title: "Export Official Dossier (PDF & PNG)",
      desc: "Download the complete official student dossier certificate, formatted with statutory university headers, academic marks, and registrar signatures.",
      highlights: [
        "Vector PDF Download: Clean A4 layout with security border and QR verification.",
        "Retina PNG Download: 1200x1700 high-resolution image certificate for external submission.",
        "Universal Student Support: Dynamic data rendering for all registered students.",
      ],
      preferredPlacement: "bottom",
    },
  ],

  // ADMIN TABS:
  "admin-overview": [
    {
      targetId: "tour-admin-overview-stats",
      tabKey: "admin-overview",
      tag: "OPERATIONS ANALYTICS",
      title: "Sanctioned Aid, Schemes & Seat Utilization",
      desc: "High-level overview of total scholarship capital sanctioned, active applicant pipeline, and scheme capacity.",
      highlights: [
        "Live KPI Counters: Real-time tracking of sanctioned funds (₹) and remaining capacity.",
        "Open Schemes: Instant status of active grant schemes accepting applications.",
        "Application Pipeline: Overview of submissions requiring committee evaluation.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-admin-overview-actions",
      tabKey: "admin-overview",
      tag: "ADMIN CONTROLS",
      title: "Create Schemes & 1-Click Simulation Seeder",
      desc: "Quick administrative controls to launch new scholarship endowments and simulate applicant flows.",
      highlights: [
        "Create New Scheme: Define funding amounts, department quotas, and CGPA cutoffs.",
        "Seed Test Scheme: Instantly generate test scenarios for evaluator verification.",
      ],
      preferredPlacement: "bottom",
    },
  ],

  "applications-review": [
    {
      targetId: "tour-admin-app-review",
      tabKey: "applications-review",
      tag: "EVALUATION WORKSPACE",
      title: "Application Pipeline & Filter Matrix",
      desc: "Review candidate dossiers, inspect uploaded statutory documents, and manage approval queues.",
      highlights: [
        "Multi-Filter Pipeline: Filter by Status (Pending, Under Review, Approved, Rejected).",
        "Credential Forensics: Check verified CGPA, annual income attestation, and DigiLocker status.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-admin-review-actions-guide",
      tabKey: "applications-review",
      tag: "DECISION ENGINE",
      title: "Merit Scoring, Sanctions & Categorized Rejections",
      desc: "Authorize scholarship awards or issue categorized statutory rejections with mandatory appeal notices.",
      highlights: [
        "Merit Scoring: Assign numerical committee evaluation scores.",
        "Automated DBT Disbursal: Approved applications immediately initiate NPCI bank transfers.",
        "Statutory Rejection Engine: Generates formal rejection notices with 14-day appeal rights.",
      ],
      preferredPlacement: "bottom",
    },
  ],

  "manage-schemes": [
    {
      targetId: "tour-admin-manage-schemes",
      tabKey: "manage-schemes",
      tag: "SCHEME GOVERNANCE",
      title: "Scheme Rules & Strict CGPA Cutoff Calibration",
      desc: "Configure scholarship schemes, define eligibility cutoffs, and manage quota capacities.",
      highlights: [
        "Strict CGPA Threshold: Set minimum required CGPA (e.g., 3.75) to gate student applications.",
        "Income Ceilings: Calibrate family income limits verified against Tahsildar certificates.",
        "Seat Quotas: Set maximum candidate limits per department and academic year.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-admin-scheme-card-item",
      tabKey: "manage-schemes",
      tag: "SCHEME LIFECYCLE",
      title: "Toggle Status & Slot Utilization Monitoring",
      desc: "Control scheme availability and monitor live slot utilization percentages in real time.",
      highlights: [
        "Open/Close Toggle: Instantly pause or resume accepting student applications.",
        "Slot Utilization Bar: Visual indicator of allocated vs remaining award seats.",
      ],
      preferredPlacement: "bottom",
    },
  ],

  analytics: [
    {
      targetId: "tour-admin-audit-ledger",
      tabKey: "analytics",
      tag: "BLOCKCHAIN PROTOCOL",
      title: "Cryptographic Merkle Ledger & Zero-Leakage DBT",
      desc: "Tamper-evident cryptographic ledger tracking every sanction, verification event, and PFMS bank credit.",
      highlights: [
        "SHA-256 Merkle Chain: Immutable cryptographic hashes anchor each transaction.",
        "Anti-Fraud Validation: Verhoeff Dihedral D5 and AES-256 tokenization protect public funds.",
        "Audit Ledger Integrity: Real-time validator verifies chain continuity without corruption.",
      ],
      preferredPlacement: "bottom",
    },
    {
      targetId: "tour-admin-export-zip-guide",
      tabKey: "analytics",
      tag: "COMPLIANCE EXPORTS",
      title: "1-Click ZIP Audit Pack & CSV Data Export",
      desc: "Download complete statutory compliance bundles for government auditors, finance officers, and institutional evaluators.",
      highlights: [
        "1-Click ZIP Audit Pack: Bundles CSV data, JSON ledger blocks, and statutory summary.",
        "Real File Downloads: Generates verified archive files directly in the browser.",
        "Statutory Compliance: Conforms to Government DBT and CAG audit protocols.",
      ],
      preferredPlacement: "bottom",
    },
  ],
};

export const DEFAULT_TOUR_STEPS = STUDENT_TOUR_STEPS;

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  role?: "STUDENT" | "ADMIN";
  steps?: TourStep[];
  tabTourKey?: string | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CardPos {
  top: number;
  left: number;
  placement: "bottom" | "top" | "left" | "right" | "center";
}

export function InteractiveTour({
  isOpen,
  onClose,
  role = "STUDENT",
  steps,
  tabTourKey = null,
  activeTab,
  onTabChange,
}: InteractiveTourProps) {
  const activeSteps =
    steps ||
    (tabTourKey && TAB_SPECIFIC_TOURS[tabTourKey]
      ? TAB_SPECIFIC_TOURS[tabTourKey]
      : role === "ADMIN"
      ? ADMIN_TOUR_STEPS
      : STUDENT_TOUR_STEPS);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [cardPos, setCardPos] = useState<CardPos>({
    top: 100,
    left: 100,
    placement: "bottom",
  });
  const cardRef = useRef<HTMLDivElement>(null);

  const currentStep = activeSteps[currentStepIndex] || activeSteps[0];

  const updatePosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const el = document.getElementById(currentStep.targetId);
    const cardEl = cardRef.current;
    const cardWidth = cardEl ? cardEl.offsetWidth : 420;
    const cardHeight = cardEl ? cardEl.offsetHeight : 340;

    if (!el) {
      // Center fallback
      setSpotlight(null);
      setCardPos({
        top: Math.max(20, (window.innerHeight - cardHeight) / 2),
        left: Math.max(20, (window.innerWidth - cardWidth) / 2),
        placement: "center",
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const pad = 8;
    const sTop = Math.max(0, rect.top - pad);
    const sLeft = Math.max(0, rect.left - pad);
    const sWidth = Math.min(window.innerWidth - sLeft, rect.width + pad * 2);

    // CRITICAL BUGFIX: Never let spotlight expand past 50% of viewport or 440px
    // This prevents the spotlight from ballooning on large card grids or page containers.
    const maxSpotlightHeight = Math.min(window.innerHeight * 0.50, 440);
    const sHeight = Math.min(rect.height + pad * 2, maxSpotlightHeight);

    setSpotlight({
      top: sTop,
      left: sLeft,
      width: sWidth,
      height: sHeight,
    });

    const pref = currentStep.preferredPlacement || "bottom";
    let computedTop = 0;
    let computedLeft = 0;
    let computedPlacement: "bottom" | "top" | "left" | "right" | "center" = pref;

    const spaceBelow = window.innerHeight - (sTop + sHeight);
    const spaceAbove = sTop;

    if (pref === "bottom") {
      if (spaceBelow >= cardHeight + 24) {
        // Fits comfortably below spotlight
        computedTop = sTop + sHeight + 14;
        computedLeft = Math.max(16, Math.min(sLeft, window.innerWidth - cardWidth - 16));
        computedPlacement = "bottom";
      } else if (spaceAbove >= cardHeight + 24) {
        // Fits comfortably above spotlight
        computedTop = Math.max(16, sTop - cardHeight - 14);
        computedLeft = Math.max(16, Math.min(sLeft, window.innerWidth - cardWidth - 16));
        computedPlacement = "top";
      } else {
        // Limited space: dock securely inside viewport bottom
        computedTop = Math.max(16, window.innerHeight - cardHeight - 20);
        computedLeft = Math.max(16, Math.min(sLeft, window.innerWidth - cardWidth - 20));
        computedPlacement = "bottom";
      }
    } else if (pref === "right") {
      const spaceRight = window.innerWidth - (sLeft + sWidth);
      if (spaceRight >= cardWidth + 24) {
        computedLeft = sLeft + sWidth + 16;
        computedTop = Math.max(16, Math.min(sTop + 10, window.innerHeight - cardHeight - 16));
        computedPlacement = "right";
      } else if (spaceBelow >= cardHeight + 24) {
        computedTop = sTop + sHeight + 14;
        computedLeft = Math.max(16, Math.min(sLeft, window.innerWidth - cardWidth - 16));
        computedPlacement = "bottom";
      } else {
        computedTop = Math.max(16, window.innerHeight - cardHeight - 20);
        computedLeft = Math.max(16, Math.min(sLeft, window.innerWidth - cardWidth - 20));
        computedPlacement = "bottom";
      }
    } else if (pref === "top") {
      if (spaceAbove >= cardHeight + 24) {
        computedTop = Math.max(16, sTop - cardHeight - 14);
        computedLeft = Math.max(16, Math.min(sLeft, window.innerWidth - cardWidth - 16));
        computedPlacement = "top";
      } else {
        computedTop = sTop + sHeight + 14;
        computedLeft = Math.max(16, Math.min(sLeft, window.innerWidth - cardWidth - 16));
        computedPlacement = "bottom";
      }
    } else {
      computedTop = sTop + sHeight + 14;
      computedLeft = Math.max(16, Math.min(sLeft, window.innerWidth - cardWidth - 16));
      computedPlacement = "bottom";
    }

    // ABSOLUTE STRICT VIEWPORT CLAMP:
    // Ensures card is ALWAYS 100% visible and interactive inside the browser window
    computedTop = Math.max(16, Math.min(computedTop, window.innerHeight - cardHeight - 20));
    computedLeft = Math.max(16, Math.min(computedLeft, window.innerWidth - cardWidth - 20));

    setCardPos({
      top: computedTop,
      left: computedLeft,
      placement: computedPlacement,
    });
  }, [isOpen, currentStep]);

  // When step changes, handle tab switching and smooth scrolling
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    if (currentStep.tabKey && activeTab !== currentStep.tabKey) {
      onTabChange(currentStep.tabKey);
    }

    const timer1 = setTimeout(() => {
      const el = document.getElementById(currentStep.targetId);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
      updatePosition();
    }, 150);

    const timer2 = setTimeout(() => {
      updatePosition();
    }, 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, currentStepIndex, currentStep, activeTab, onTabChange, updatePosition]);

  // Listen to window resize and scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleResizeOrScroll = () => {
      updatePosition();
    };

    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll);
    };
  }, [isOpen, updatePosition]);

  // Keyboard navigation: Esc, Left, Right
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        if (currentStepIndex < activeSteps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, activeSteps.length, onClose]);

  // Reset step index when opened or role/tab changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen, role, tabTourKey]);

  if (!isOpen || !currentStep) return null;

  const totalSteps = activeSteps.length;

  const handleNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const getSubheadTitle = () => {
    if (tabTourKey) {
      const formatted = tabTourKey
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      return `${formatted} Guide`;
    }
    return role === "ADMIN" ? "Admin Tour" : "Student Tour";
  };

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-auto">
      {/* Click-catcher overlay */}
      <div
        className="fixed inset-0 bg-transparent"
        onClick={() => {
          // Backdrop click
        }}
      />

      {/* Spotlight cutout box with massive surrounding shadow */}
      {spotlight && (
        <div
          className="fixed rounded-2xl pointer-events-none transition-all duration-300 ease-out z-[9995]"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            border: "2px solid rgba(255, 255, 255, 0.95)",
            boxShadow:
              role === "ADMIN"
                ? "0 0 0 9999px rgba(15, 23, 42, 0.70), 0 0 30px rgba(113, 42, 226, 0.65), inset 0 0 15px rgba(113, 42, 226, 0.15)"
                : "0 0 0 9999px rgba(15, 23, 42, 0.65), 0 0 30px rgba(147, 51, 234, 0.6), inset 0 0 15px rgba(147, 51, 234, 0.15)",
          }}
        />
      )}

      {/* Fallback full backdrop if no target element is present */}
      {!spotlight && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-[2px] z-[9995]" />
      )}

      {/* Floating Tour Guide Card */}
      <div
        ref={cardRef}
        className="fixed z-[10000] w-[420px] max-w-[92vw] max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-300 ease-out"
        style={{
          top: cardPos.top,
          left: cardPos.left,
        }}
      >
        {/* Pointer Arrow Beak */}
        {cardPos.placement === "bottom" && (
          <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-t border-l border-slate-200 rotate-45 z-10" />
        )}
        {cardPos.placement === "top" && (
          <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white border-b border-r border-slate-200 rotate-45 z-10" />
        )}
        {cardPos.placement === "right" && (
          <div className="absolute -left-2 top-8 w-4 h-4 bg-white border-b border-l border-slate-200 rotate-45 z-10" />
        )}
        {cardPos.placement === "left" && (
          <div className="absolute -right-2 top-8 w-4 h-4 bg-white border-t border-r border-slate-200 rotate-45 z-10" />
        )}

        {/* Top Gradient Bar */}
        <div
          className={`h-1.5 w-full shrink-0 ${
            role === "ADMIN"
              ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800"
              : "bg-gradient-to-r from-purple-500 via-indigo-600 to-violet-600"
          }`}
        />

        {/* Card Content with scroll protection */}
        <div className="p-6 overflow-y-auto max-h-[calc(88vh-20px)] flex flex-col justify-between">
          <div>
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm shrink-0 ${
                    role === "ADMIN"
                      ? "bg-purple-100 text-purple-700 border border-purple-300"
                      : "bg-purple-50 text-purple-600 border border-purple-200"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
                    {currentStep.tag}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    {getSubheadTitle()} • Step {currentStepIndex + 1} of {totalSteps}
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Close Guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Heading */}
            <h3 className="text-lg font-bold text-slate-900 tracking-tight mt-3 font-heading">
              {currentStep.title}
            </h3>

            {/* Description */}
            <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
              {currentStep.desc}
            </p>

            {/* Key Capabilities / Highlights */}
            {currentStep.highlights && currentStep.highlights.length > 0 && (
              <div className="mt-3.5 space-y-1.5 bg-slate-50/90 rounded-xl p-3 border border-slate-100">
                {currentStep.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{h}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 shrink-0">
            {/* Step Dots & Esc hint */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {activeSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStepIndex(i)}
                    className={`transition-all rounded-full ${
                      i === currentStepIndex
                        ? "w-6 h-1.5 bg-purple-600"
                        : "w-1.5 h-1.5 bg-slate-200 hover:bg-slate-300"
                    }`}
                    title={`Go to step ${i + 1}`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-400 font-medium ml-1">
                Esc to skip
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              {currentStepIndex < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-500/25 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Got it!</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
