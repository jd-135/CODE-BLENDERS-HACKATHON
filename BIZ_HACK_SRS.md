# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Standard IEEE 830-1998 Format
**Project Name:** PS78 – Scholarship Application Management System  
**Hackathon Event:** BIZ HACK ’26 (Learning Center)  
**Submission Deadline:** September 23, 2026 — 2:30 PM  
**Document Version:** 1.0.0-FINAL  
**Team / Authors:** [Code Blenders / Jay Dinakar R & Team]  

---

## 1. INTRODUCTION

### 1.1 Purpose
This document provides the formal Software Requirements Specification for the **PS78 – Scholarship Application Management System**, an institutional platform facilitating merit- and need-based scholarship creation, student application processing, automated eligibility verification, and dynamic quota/slot-decrementing award decisions.

### 1.2 Scope
The software delivers:
- An **Administrative Control Center** to publish grant programs with specific eligibility rules (minimum GPA, maximum household income, allowed academic departments) and finite award slot allocations.
- A **Student Discovery & Application Portal** enabling students to explore grants, verify criteria, submit structured applications with personal statements, and track their application progress in real-time.
- An **Automated Quota & Slot-Decrementing State Machine** that automatically decrements remaining award slots upon administrative approval and automatically transitions fully awarded scholarships to a `CLOSED` state, blocking subsequent submissions.
- An **Immutable Audit Log & Telemetry Engine** tracking all application submissions, administrative decisions, and quota adjustments.

### 1.3 Definitions, Acronyms, and Abbreviations
- **SRS:** Software Requirements Specification (IEEE Std 830-1998)
- **GPA:** Grade Point Average
- **Slot / Quota:** Finite numerical limit of available grant disbursements for a specific scholarship program
- **RLS:** Row Level Security (PostgreSQL)
- **BaaS:** Backend-as-a-Service (Supabase PostgreSQL)

---

## 2. OVERALL DESCRIPTION

### 2.1 Problem Statement (PS78)
Academic institutions struggle with manual, spreadsheet-based scholarship evaluations resulting in over-allocation of limited financial funds, delayed notification to students in financial need, and a lack of transparency in the selection process. Without automated slot enforcement, scholarships frequently accept applications long after funding quotas have been exhausted.

### 2.2 System Architecture & Flow
```
+-----------------------------------------------------------------------------------+
|                        Next.js 16 App Router Frontend                             |
|  [Student Portal: Catalog, Criteria Match, Application Tracker]                   |
|  [Admin Console: Program Creator, Review Board, Slot Management, Audit Telemetry] |
+-----------------------------------------+-----------------------------------------+
                                          |
                               [Hybrid DB Repository]
                                          |
                +-------------------------+-------------------------+
                |                                                   |
       [Supabase Cloud PostgreSQL]                        [Local State Store]
       - Table: scholarships                              (Offline Failover Engine)
       - Table: applications                              - Slot decrement trigger
       - Table: audit_logs                                - Memory state buffer
       - Trigger: handle_slot_deduction()
```

### 2.3 User Roles & Personas
1. **Student Applicant:** Discovers scholarships, evaluates eligibility prerequisites, submits applications, and monitors approval status.
2. **Scholarship Administrator / Reviewer:** Configures grant criteria, sets quota limits, reviews submitted essays and GPAs, issues approvals/rejections, and monitors disbursement telemetry.

### 2.4 Operating Environment
- Client: Modern web browsers (Desktop & Mobile)
- Server/Cloud: Vercel Edge Runtime + Supabase PostgreSQL

---

## 3. SPECIFIC FUNCTIONAL REQUIREMENTS

### FR-1: Scholarship Creation & Eligibility Rules (Admin)
- **Inputs:** Program Title, Description, Category (`STEM & Innovation`, `Need-Based`, `Merit-Based`, `Diversity & Inclusion`), Award Grant ($), Total Available Slots (int > 0), Minimum GPA, Maximum Family Income Threshold, Deadline.
- **Processing:** Initializes new record with `remaining_slots = total_slots` and `status = OPEN`.
- **Outputs:** Published scholarship in student catalog and recorded audit log event.

### FR-2: Student Application Submission & Criteria Check (Student)
- **Inputs:** Target Scholarship ID, Student GPA, Annual Household Income, Academic Department, Personal Statement / Essay.
- **Processing:** Validates that `remaining_slots > 0` and `status == OPEN`. Prevents duplicate submissions from the same student email for the same scholarship.
- **Outputs:** Created application record with status `PENDING`, immediate status feedback to applicant.

### FR-3: Application Review & Automated Slot Decrementing (Admin)
- **Inputs:** Application ID, Decision (`APPROVED`, `REJECTED`, `UNDER_REVIEW`), Reviewer Remarks.
- **Processing:** 
  - If `APPROVED`: Decrements `remaining_slots` by 1 on the target scholarship.
  - If `remaining_slots == 0`: Automatically updates scholarship `status` to `CLOSED`.
  - If a previously approved award is reverted: Restores 1 slot and re-opens scholarship.
- **Outputs:** Updated application status, recalculated parent scholarship quota, broadcasted audit event.

### FR-4: Real-Time Application Tracking & Closed-Scholarship Lockout
- **Inputs:** Student Email or User Session.
- **Processing:** Queries all submitted applications with real-time status (`PENDING` → `UNDER_REVIEW` → `APPROVED` / `REJECTED`) and committee review notes.
- **Outputs:** Interactive status board with visual timeline and disbursement notification. Closed scholarships disable apply buttons with explicit "Closed (Slots Full)" status.

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 Usability & Accessibility
- Accessible shadcn/ui components with high-contrast color coding for statuses (Green = Approved/Open, Red = Rejected/Closed, Amber = Under Review/Limited Slots).
- Responsive mobile & desktop layout.

### 4.2 Performance & Availability
- Instantaneous client-side state updates (<50ms).
- Sub-1s page load times via Next.js SSR and Turbopack.

### 4.3 Reliability & Offline Resilience
- Dual-mode architecture: Automatic fallback to local in-memory persistence if cloud database network drops.

### 4.4 Data Integrity & Security
- Row Level Security (RLS) enabled on Supabase PostgreSQL tables.
- Database-level trigger (`handle_slot_deduction_and_closure`) preventing race conditions during concurrent approvals.

---

## 5. SYSTEM ARCHITECTURE & DATABASE SCHEMA

```
+--------------------------+          1:N          +--------------------------+
|  profiles                | --------------------> |  applications            |
|--------------------------|                       |--------------------------|
| id (UUID, PK)            |                       | id (UUID, PK)            |
| email (TEXT, UNIQUE)     |                       | scholarship_id (UUID, FK)|
| full_name (TEXT)         |                       | student_id (UUID, FK)    |
| role (ADMIN/STUDENT)     |                       | student_name (TEXT)      |
| department (TEXT)        |                       | student_email (TEXT)     |
| gpa (NUMERIC)            |                       | student_gpa (NUMERIC)    |
| annual_income (NUMERIC)  |                       | annual_income (NUMERIC)  |
+--------------------------+                       | essay_statement (TEXT)   |
                                                   | status (PENDING/APPROVED)|
                                                   | reviewed_by (TEXT)       |
                                                   | review_notes (TEXT)      |
                                                   | reviewed_at (TIMESTAMPTZ)|
                                                   +------------+-------------+
                                                                |
                                                                | N:1
                                                                v
+--------------------------+          1:N          +--------------------------+
|  audit_logs              | <-------------------- |  scholarships            |
|--------------------------|                       |--------------------------|
| id (UUID, PK)            |                       | id (UUID, PK)            |
| action (TEXT)            |                       | title (TEXT)             |
| entity (TEXT)            |                       | category (TEXT)          |
| entity_id (TEXT)         |                       | award_amount (NUMERIC)   |
| performed_by (TEXT)      |                       | total_slots (INTEGER)    |
| details (TEXT)           |                       | remaining_slots (INTEGER)|
| created_at (TIMESTAMPTZ) |                       | status (OPEN/CLOSED)     |
+--------------------------+                       | min_gpa (NUMERIC)        |
                                                   | max_income (NUMERIC)     |
                                                   | deadline (TIMESTAMPTZ)   |
                                                   +--------------------------+
```

---

## 6. VERIFICATION & TRACEABILITY MATRIX

| Req ID | Feature Component | Verification Method | Status |
| :--- | :--- | :--- | :---: |
| **FR-1** | Scholarship Creation (`src/lib/db/`) | Admin Modal & DB Insert | ✅ VERIFIED |
| **FR-2** | Student Application Submission | Validation & Constraint Check | ✅ VERIFIED |
| **FR-3** | Auto Slot Decrement & Closure | Trigger & Store State Test | ✅ VERIFIED |
| **FR-4** | Live Status Tracker & Lockout | Student Portal UI View | ✅ VERIFIED |
| **NFR-3**| Offline Storage Failover | Network Disconnect Test | ✅ VERIFIED |

---
*Generated for BIZ HACK ’26 Live Demonstration & Evaluator Review.*
