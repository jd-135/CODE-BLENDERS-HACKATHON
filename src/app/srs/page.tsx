"use client";

import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Printer, FileCheck2 } from "lucide-react";
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
              IEEE Std 830-1998 Formatted
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
            Enterprise Workflow Automation &amp; Intelligence Platform
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-zinc-200 text-xs">
            <div>
              <span className="text-zinc-500 block">Event:</span>
              <span className="font-semibold text-zinc-800">BIZ HACK ’26</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Evaluation Date:</span>
              <span className="font-semibold text-zinc-800">September 23, 2026</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Code Freeze:</span>
              <span className="font-semibold text-red-600 font-mono">2:30 PM Sharp</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Document Ver:</span>
              <span className="font-semibold text-zinc-800">1.0.0-PROTOTYPE</span>
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
              <strong>1.1 Purpose:</strong> This document specifies the complete software requirements for the BIZ HACK ’26 Enterprise Workflow &amp; Business Intelligence Platform.
            </p>
            <p>
              <strong>1.2 Scope:</strong> The platform provides end-to-end workflow orchestration, automated anomaly detection, real-time auditability, and executive KPI intelligence designed for high-consequence business domains.
            </p>
            <p>
              <strong>1.3 Intended Audience:</strong> Hackathon evaluators, enterprise architects, operations managers, and technical review committees.
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
              <strong>2.1 Problem Statement:</strong> Modern enterprises face critical operational bottlenecks due to fragmented tooling, delayed exception handling, missing audit logs, and brittle single-point-of-failure cloud connections.
            </p>
            <p>
              <strong>2.2 Solution Architecture:</strong> A reactive Next.js 16 full-stack control center paired with a hybrid offline-first persistence layer, sub-second telemetry calculation, and cryptographic event tracking.
            </p>
            <p>
              <strong>2.3 User Personas:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
              <li><strong>Executive / Auditor:</strong> Monitors SLA compliance, system efficiency score, and immutable audit logs.</li>
              <li><strong>Operations Manager:</strong> Creates business entities, allocates budgets, and assigns tasks.</li>
              <li><strong>Workflow Operator:</strong> Updates task execution progress and flags operational disruptions.</li>
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
              <h4 className="font-bold text-zinc-900">FR-1: Business Entity &amp; Lifecycle Management</h4>
              <p className="text-xs text-zinc-600 mt-1"><strong>Inputs:</strong> Entity name, priority level, category, budget, owner metadata.</p>
              <p className="text-xs text-zinc-600"><strong>Processing:</strong> Validates schema and enforces sequential lifecycle transitions (Draft → Active → Pending Review → Completed).</p>
              <p className="text-xs text-zinc-600"><strong>Outputs:</strong> Updated entity catalog, recalculation of aggregate budget metrics, state-change audit event.</p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-md">
              <h4 className="font-bold text-zinc-900">FR-2: Granular Task Delegation &amp; SLA Tracking</h4>
              <p className="text-xs text-zinc-600 mt-1"><strong>Inputs:</strong> Entity ID, task title, priority, assignee, due date.</p>
              <p className="text-xs text-zinc-600"><strong>Processing:</strong> Computes parent entity completion percentage and overall system efficiency score.</p>
              <p className="text-xs text-zinc-600"><strong>Outputs:</strong> Real-time task status board with SLA compliance metrics.</p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-md">
              <h4 className="font-bold text-zinc-900">FR-3: Immutable Cryptographic Audit Trail</h4>
              <p className="text-xs text-zinc-600 mt-1"><strong>Inputs:</strong> Action event payload, actor identity, entity reference.</p>
              <p className="text-xs text-zinc-600"><strong>Processing:</strong> Appends structured timestamped logs with chronological sequencing.</p>
              <p className="text-xs text-zinc-600"><strong>Outputs:</strong> Searchable tamper-evident log stream in the operator console.</p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-md">
              <h4 className="font-bold text-zinc-900">FR-4: Real-Time Telemetry &amp; Synthetic Data Generation</h4>
              <p className="text-xs text-zinc-600 mt-1"><strong>Inputs:</strong> Dynamic seed trigger / Data reset command.</p>
              <p className="text-xs text-zinc-600"><strong>Processing:</strong> Ingests high-fidelity domain records via FakerEngine and recalculates real-time resolution metrics.</p>
              <p className="text-xs text-zinc-600"><strong>Outputs:</strong> Dynamic executive dashboard KPI cards.</p>
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
              <strong className="block text-zinc-900 mb-1">4.1 Usability &amp; Design</strong>
              WCAG AA accessible contrast, responsive Tailwind CSS styling, dark/light theme fidelity.
            </div>
            <div className="border border-zinc-200 p-3 rounded bg-zinc-50">
              <strong className="block text-zinc-900 mb-1">4.2 Performance &amp; Latency</strong>
              Sub-100ms client state transitions, &lt;1.0s FCP, Turbopack optimized bundle.
            </div>
            <div className="border border-zinc-200 p-3 rounded bg-zinc-50">
              <strong className="block text-zinc-900 mb-1">4.3 Offline Resilience</strong>
              100% operation under disconnected venue Wi-Fi via local storage replication.
            </div>
            <div className="border border-zinc-200 p-3 rounded bg-zinc-50">
              <strong className="block text-zinc-900 mb-1">4.4 Security &amp; Isolation</strong>
              Environment variable sanitization, role-based protection, sanitized inputs.
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section className="mb-8 space-y-3">
          <h3 className="text-xl font-bold text-zinc-900 border-b border-zinc-200 pb-1">
            5. System Architecture &amp; Database Schema
          </h3>
          <div className="text-xs font-mono bg-zinc-900 text-zinc-100 p-4 rounded-md overflow-x-auto print:bg-zinc-100 print:text-zinc-900 print:border print:border-zinc-300">
{`+-------------------+        1:N         +-------------------+
|  UserProfile      | -----------------> |  BusinessEntity   |
|-------------------|                    |-------------------|
| id (PK)           |                    | id (PK)           |
| email, fullName   |                    | name, code        |
| role, department  |                    | category, status  |
+-------------------+                    | priority, budget  |
                                         +---------+---------+
                                                   | 1:N
                                                   v
+-------------------+        1:N         +-------------------+
|  AuditLog         | <----------------- |  WorkflowTask     |
|-------------------|                    |-------------------|
| id, action, details                    | id, title, status |
| performedBy, time                      | priority, dueDate |
+-------------------+                    +-------------------+`}
          </div>
        </section>

        {/* Document Footer */}
        <footer className="pt-6 border-t border-zinc-300 flex items-center justify-between text-xs text-zinc-500">
          <div>BIZ HACK ’26 Official IEEE Requirements Document</div>
          <div>Page 1 of 1</div>
        </footer>
      </article>
    </div>
  );
}
