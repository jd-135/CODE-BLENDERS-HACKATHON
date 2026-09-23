-- ==============================================================================
-- PS78: SCHOLARSHIP APPLICATION MANAGEMENT SYSTEM
-- Supabase PostgreSQL Database Schema & Row-Level Security
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STUDENT', 'REVIEWER')),
    department TEXT DEFAULT 'Computer Science',
    gpa NUMERIC(3,2) DEFAULT 3.50,
    annual_income NUMERIC(12,2) DEFAULT 45000.00,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Scholarships Table
CREATE TABLE IF NOT EXISTS public.scholarships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Merit-Based', 'Need-Based', 'STEM & Innovation', 'First-Generation', 'Diversity & Inclusion', 'Athletic & Leadership')),
    award_amount NUMERIC(10,2) NOT NULL,
    total_slots INTEGER NOT NULL CHECK (total_slots > 0),
    remaining_slots INTEGER NOT NULL CHECK (remaining_slots >= 0),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED')),
    deadline TIMESTAMPTZ NOT NULL,
    min_gpa NUMERIC(3,2) DEFAULT 0.00,
    max_income NUMERIC(12,2) DEFAULT NULL,
    eligible_departments TEXT[] DEFAULT ARRAY['All Departments'],
    created_by TEXT NOT NULL DEFAULT 'admin@bizhack.io',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scholarship_id UUID NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    student_department TEXT NOT NULL,
    student_gpa NUMERIC(3,2) NOT NULL,
    annual_income NUMERIC(12,2) NOT NULL,
    essay_statement TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
    reviewed_by TEXT,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_student_scholarship UNIQUE (scholarship_id, student_email)
);

-- 5. Audit & Activity Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Trigger to automatically close scholarship when remaining_slots reaches 0
CREATE OR REPLACE FUNCTION handle_slot_deduction_and_closure()
RETURNS TRIGGER AS $$
BEGIN
    -- If application is approved, decrement remaining slots
    IF (NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED')) THEN
        UPDATE public.scholarships
        SET remaining_slots = remaining_slots - 1,
            status = CASE WHEN remaining_slots - 1 <= 0 THEN 'CLOSED' ELSE status END,
            updated_at = NOW()
        WHERE id = NEW.scholarship_id AND remaining_slots > 0;
        
        -- Log the action
        INSERT INTO public.audit_logs (action, entity, entity_id, performed_by, details)
        VALUES ('APPLICATION_APPROVED', 'Scholarship', NEW.scholarship_id::TEXT, COALESCE(NEW.reviewed_by, 'System Admin'), 
                'Approved award for ' || NEW.student_name || '. Remaining slots decremented.');
    END IF;

    -- If previously approved application is rejected/cancelled, restore slot
    IF (OLD.status = 'APPROVED' AND NEW.status != 'APPROVED') THEN
        UPDATE public.scholarships
        SET remaining_slots = remaining_slots + 1,
            status = 'OPEN',
            updated_at = NOW()
        WHERE id = NEW.scholarship_id;
        
        INSERT INTO public.audit_logs (action, entity, entity_id, performed_by, details)
        VALUES ('APPROVAL_REVERTED', 'Scholarship', NEW.scholarship_id::TEXT, COALESCE(NEW.reviewed_by, 'System Admin'), 
                'Restored 1 slot for scholarship.');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_application_approval ON public.applications;
CREATE TRIGGER trigger_application_approval
AFTER UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION handle_slot_deduction_and_closure();

-- 7. Insert Initial Seed Data for Demo & Evaluation
INSERT INTO public.scholarships (title, description, category, award_amount, total_slots, remaining_slots, status, deadline, min_gpa, max_income, eligible_departments)
VALUES 
(
    'NextGen STEM Leaders Fellowship 2026', 
    'Full tuition grant and research stipend awarded to outstanding undergraduate and graduate students pursuing cutting-edge technology and engineering majors.', 
    'STEM & Innovation', 
    15000.00, 
    5, 
    3, 
    'OPEN', 
    NOW() + INTERVAL '30 days', 
    3.75, 
    75000.00, 
    ARRAY['Computer Science', 'Electrical Engineering', 'Data Science', 'Mechanical Engineering']
),
(
    'Global Opportunity & Access Scholarship', 
    'Need-based financial assistance designed to empower first-generation and underrepresented students with academic excellence.', 
    'Need-Based', 
    8500.00, 
    8, 
    4, 
    'OPEN', 
    NOW() + INTERVAL '20 days', 
    3.20, 
    40000.00, 
    ARRAY['All Departments']
),
(
    'Women in Technology & Cyber Systems Award', 
    'Dedicated scholarship promoting female leadership and innovation across software engineering, AI, and cybersecurity disciplines.', 
    'Diversity & Inclusion', 
    12000.00, 
    4, 
    1, 
    'OPEN', 
    NOW() + INTERVAL '15 days', 
    3.50, 
    90000.00, 
    ARRAY['Computer Science', 'Information Technology', 'Cybersecurity']
),
(
    'Dean''s Academic Merit Grant', 
    'Prestigious institutional merit award recognizing exceptional academic trajectory and community impact.', 
    'Merit-Based', 
    5000.00, 
    2, 
    0, 
    'CLOSED', 
    NOW() - INTERVAL '2 days', 
    3.90, 
    NULL, 
    ARRAY['All Departments']
)
ON CONFLICT DO NOTHING;
