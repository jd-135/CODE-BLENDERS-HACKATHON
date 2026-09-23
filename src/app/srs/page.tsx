"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileCheck2, Award, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SRSViewerPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 font-sans print:bg-white print:text-black">
      {/* Non-printable Control Toolbar */}
      <nav className="border-b border-zinc-200 bg-white/90 backdrop-blur sticky top-0 z-50 print:hidden px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
              IEEE Std 830-1998 Formatted Specification
            </span>
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Save as PDF / Print Document
            </Button>
          </div>
        </div>
      </nav>

      {/* Printable IEEE Document Body */}
      <article className="max-w-4xl mx-auto bg-white my-8 p-8 sm:p-14 shadow-lg border border-zinc-200 print:shadow-none print:border-none print:my-0 print:p-0 rounded-lg">
        {/* Cover / Header Section */}
        <header className="border-b-2 border-zinc-900 pb-6 mb-8">
          <div className="flex items-center gap-2 text-indigo-700 font-mono text-xs font-bold uppercase tracking-wider mb-2">
            <FileCheck2 className="w-4 h-4" /> IEEE Std 830-1998 Compliant Specification
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950">
            Software Requirements Specification (SRS)
          </h1>
          <h2 className="text-lg text-zinc-600 font-medium mt-1">
            PS78 – Scholarship Application Management System
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-zinc-200 text-xs">
            <div>
              <span className="text-zinc-500 block">Event:</span>
              <span className="font-semibold text-zinc-800">BIZ HACK ’26</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Problem Statement:</span>
              <span className="font-semibold text-indigo-700 font-mono">PS78</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Code Freeze:</span>
              <span className="font-semibold text-red-600 font-mono">2:30 PM Sharp</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Document Ver:</span>
              <span className="font-semibold text-zinc-800">1.0.0-FINAL</span>
            </div>
          </div>
        </header>

        {/* Section 1 */}
        <section className="mb-8 space-y-3">
          <h3 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-1">
            1. Introduction
          </h3>
          <div className="text-sm text-zinc-700 leading-relaxed space-y-2">
            <p>
              <strong>1.1 Purpose:</strong> This document specifies the software requirements for the <strong>PS78 – Scholarship Application Management System</strong>, an institutional platform designed to manage scholarship creation, applicant eligibility review, and automated quota/slot-decrementing award decisions.
            </p>
            <p>
              <strong>1.2 Scope:</strong> The application enables administrators to configure grant programs with finite slot limits and criteria (GPA, income, majors), allows students to apply and track their review progress in real-time, and guarantees automatic slot deduction upon award approval.
            </p>
            <p>
              <strong>1.3 Intended Audience:</strong> Hackathon evaluators, university scholarship committees, financial aid administrators, and software architects.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="mb-8 space-y-3">
          <h3 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-1">
            2. Overall Description
          </h3>
          <div className="text-sm text-zinc-700 leading-relaxed space-y-2">
            <p>
              <strong>2.1 Problem Statement (PS78):</strong> Academic institutions frequently experience funding over-allocation and administrative friction due to manual, spreadsheet-based application reviews. Without automated slot enforcement, closed scholarships often continue accepting applications after slots have been filled.
            </p>
            <p>
              <strong>2.2 Solution Architecture:</strong> A reactive Next.js 16 full-stack control center paired with Supabase PostgreSQL (and local offline failover engine), supporting atomic slot-decrement triggers and real-time student application tracking.
            </p>
            <p>
              <strong>2.3 User Personas:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li><strong>Student Applicant:</strong> Browses open programs, verifies GPA/income eligibility, submits applications with personal statements, and tracks decision statuses.</li>
              <li><strong>Administrator / Reviewer:</strong> Creates new grant programs with finite slots, reviews student submissions, approves awards (auto-decrementing slots), and monitors telemetry.</li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-8 space-y-4">
          <h3 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-1">
            3. Specific Functional Requirements
          </h3>

          <div className="space-y-4 text-sm text-zinc-700">
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-md">
              <h4 className="font-bold text-zinc-900">FR-1: Scholarship Creation &amp; Eligibility Criteria (Admin)</h4>
              <p className="text-xs text-zinc-600 mt-1"><strong>Inputs:</strong> Title, description, category, award amount ($), total slots, minimum GPA, maximum income threshold, deadline.</p>
              <p className="text-xs text-zinc-600"><strong>Processing:</strong> Validates input parameters and initializes record with <code>remaining_slots = total_slots</code> and status <code>OPEN</code>.</p>
              <p className="text-xs text-zinc-600"><strong>Outputs:</strong> Published scholarship in student catalog and audit log record.</p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-md">
              <h4 className="font-bold text-zinc-900">FR-2: Student Application Submission &amp; Eligibility Validation (Student)</h4>
              <p className="text-xs text-zinc-600 mt-1"><strong>Inputs:</strong> Target scholarship ID, student GPA, family income, academic department, personal statement/essay.</p>
              <p className="text-xs text-zinc-600"><strong>Processing:</strong> Validates that the scholarship is <code>OPEN</code> with available slots (&gt;0). Enforces unique constraint preventing duplicate submissions by the same student.</p>
              <p className="text-xs text-zinc-600"><strong>Outputs:</strong> Created application in <code>PENDING</code> status and applicant confirmation.</p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-md">
              <h4 className="font-bold text-zinc-900">FR-3: Application Review &amp; Automated Slot Decrementing (Admin)</h4>
              <p className="text-xs text-zinc-600 mt-1"><strong>Inputs:</strong> Application ID, decision (<code>APPROVED</code>, <code>REJECTED</code>, <code>UNDER_REVIEW</code>), review notes.</p>
              <p className="text-xs text-zinc-600"><strong>Processing:</strong> Upon <code>APPROVED</code> decision, automatically decrements <code>remaining_slots</code> by 1. When remaining slots reach 0, automatically transitions scholarship status to <code>CLOSED</code>.</p>
              <p className="text-xs text-zinc-600"><strong>Outputs:</strong> Updated application record, decremented scholarship slot count, broadcasted audit event.</p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-md">
              <h4 className="font-bold text-zinc-900">FR-4: Real-Time Application Tracking &amp; Closed-Scholarship Lockout</h4>
              <p className="text-xs text-zinc-600 mt-1"><strong>Inputs:</strong> Student session / email query.</p>
              <p className="text-xs text-zinc-600"><strong>Processing:</strong> Queries student applications with real-time status updates (Submitted → Under Review → Awarded / Rejected) and committee feedback. Closed scholarships disable application submissions.</p>
              <p className="text-xs text-zinc-600"><strong>Outputs:</strong> Real-time status tracker table and visual badge indicators.</p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-8 space-y-3">
          <h3 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-1">
            4. Non-Functional Requirements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-zinc-700">
            <div className="border border-zinc-200 p-3 rounded bg-zinc-50">
              <strong className="block text-zinc-900 mb-1">4.1 Usability &amp; Visual Design</strong>
              Accessible shadcn/ui components, high-contrast status tags, and mobile-responsive layouts.
            </div>
            <div className="border border-zinc-200 p-3 rounded bg-zinc-50">
              <strong className="block text-zinc-900 mb-1">4.2 Performance &amp; Latency</strong>
              Sub-100ms state updates, instantaneous slot decrementing via PostgreSQL triggers.
            </div>
            <div className="border border-zinc-200 p-3 rounded bg-zinc-50">
              <strong className="block text-zinc-900 mb-1">4.3 Offline Resilience</strong>
              Deterministic failover to local memory store if venue Wi-Fi blocks cloud ports.
            </div>
            <div className="border border-zinc-200 p-3 rounded bg-zinc-50">
              <strong className="block text-zinc-900 mb-1">4.4 Security &amp; Data Protection</strong>
              Row Level Security (RLS) active on all Supabase tables; sanitized form inputs.
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="mb-8 space-y-3">
          <h3 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-1">
            5. System Architecture &amp; Database Schema
          </h3>
          <div className="text-xs font-mono bg-zinc-900 text-zinc-100 p-4 rounded-md overflow-x-auto print:bg-zinc-100 print:text-zinc-900 print:border print:border-zinc-300">
{`+--------------------------+          1:N          +--------------------------+
|  profiles                | --------------------> |  applications            |
|--------------------------|                       |--------------------------|
| id (UUID, PK)            |                       | id (UUID, PK)            |
| email, full_name, role   |                       | scholarship_id (UUID, FK)|
| department, gpa, income  |                       | student_id, student_name |
+--------------------------+                       | student_gpa, income      |
                                                   | essay_statement (TEXT)   |
                                                   | status (PENDING/APPROVED)|
                                                   | reviewed_by, review_notes|
                                                   | reviewed_at (TIMESTAMPTZ)|
                                                   +------------+-------------+
                                                                |
                                                                | N:1
                                                                v
+--------------------------+          1:N          +--------------------------+
|  audit_logs              | <-------------------- |  scholarships            |
|--------------------------|                       |--------------------------|
| id, action, details      |                       | id (UUID, PK)            |
| entity, entity_id        |                       | title, category, award   |
| performed_by, created_at |                       | total_slots, remaining   |
+--------------------------+                       | status (OPEN/CLOSED)     |
                                                   | min_gpa, max_income      |
                                                   +--------------------------+`}
          </div>
        </section>

        {/* Document Footer */}
        <footer className="pt-6 border-t border-zinc-300 flex items-center justify-between text-xs text-zinc-500">
          <div>BIZ HACK ’26 · Official Requirements Specification Document</div>
          <div>Page 1 of 1</div>
        </footer>
      </article>
    </div>
  );
}
