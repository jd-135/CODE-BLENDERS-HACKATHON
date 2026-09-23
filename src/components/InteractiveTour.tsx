"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
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
// 1. STUDENT ONBOARDING & NAVIGATION TOUR
// Tailored for Student Applicants exploring grants, documents, and DBT awards
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
// 2. ADMINISTRATOR & COMMITTEE CHAIR TOUR
// Tailored for Operations, Scheme Governance, Quota Rules & Audit Ledger
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

export const DEFAULT_TOUR_STEPS = STUDENT_TOUR_STEPS;

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  role?: "STUDENT" | "ADMIN";
  steps?: TourStep[];
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
  activeTab,
  onTabChange,
}: InteractiveTourProps) {
  const activeSteps = steps || (role === "ADMIN" ? ADMIN_TOUR_STEPS : STUDENT_TOUR_STEPS);
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
    const sHeight = rect.height + pad * 2;

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

    if (pref === "bottom") {
      const spaceBelow = window.innerHeight - (sTop + sHeight);
      if (spaceBelow >= cardHeight + 20 || sTop < cardHeight + 20) {
        computedTop = sTop + sHeight + 14;
        computedLeft = Math.max(
          16,
          Math.min(sLeft, window.innerWidth - cardWidth - 16)
        );
        computedPlacement = "bottom";
      } else {
        // Flip to top
        computedTop = Math.max(16, sTop - cardHeight - 14);
        computedLeft = Math.max(
          16,
          Math.min(sLeft, window.innerWidth - cardWidth - 16)
        );
        computedPlacement = "top";
      }
    } else if (pref === "right") {
      const spaceRight = window.innerWidth - (sLeft + sWidth);
      if (spaceRight >= cardWidth + 24) {
        computedLeft = sLeft + sWidth + 16;
        computedTop = Math.max(
          16,
          Math.min(sTop + 10, window.innerHeight - cardHeight - 16)
        );
        computedPlacement = "right";
      } else {
        // Fallback to bottom
        computedTop = Math.min(
          sTop + sHeight + 14,
          window.innerHeight - cardHeight - 16
        );
        computedLeft = Math.max(
          16,
          Math.min(sLeft, window.innerWidth - cardWidth - 16)
        );
        computedPlacement = "bottom";
      }
    } else {
      computedTop = sTop + sHeight + 14;
      computedLeft = Math.max(
        16,
        Math.min(sLeft, window.innerWidth - cardWidth - 16)
      );
      computedPlacement = "bottom";
    }

    setCardPos({
      top: computedTop,
      left: computedLeft,
      placement: computedPlacement,
    });
  }, [isOpen, currentStep]);

  // When step changes, handle tab switching and smooth scrolling
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep.tabKey && activeTab !== currentStep.tabKey) {
      onTabChange(currentStep.tabKey);
    }

    const timer1 = setTimeout(() => {
      const el = document.getElementById(currentStep.targetId);
      if (el) {
        const r = el.getBoundingClientRect();
        const isInViewport =
          r.top >= 0 &&
          r.bottom <= window.innerHeight &&
          r.left >= 0 &&
          r.right <= window.innerWidth;

        if (!isInViewport) {
          el.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          });
        }
      }
      updatePosition();
    }, 120);

    const timer2 = setTimeout(() => {
      updatePosition();
    }, 400);

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

  // Reset step index when opened or role switches
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen, role]);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden">
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
          className="fixed rounded-2xl pointer-events-none transition-all duration-400 ease-out z-[9995]"
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
        className="fixed z-[10000] w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transition-all duration-400 ease-out"
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
          className={`h-1.5 w-full ${
            role === "ADMIN"
              ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800"
              : "bg-gradient-to-r from-purple-500 via-indigo-600 to-violet-600"
          }`}
        />

        {/* Card Content */}
        <div className="p-6">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
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
                  {role === "ADMIN" ? "Admin Tour" : "Student Tour"} • Step {currentStepIndex + 1} of {totalSteps}
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

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100">
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
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-500/25 transition-all flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-500/25 transition-all flex items-center gap-1"
                >
                  <span>Finish</span>
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
