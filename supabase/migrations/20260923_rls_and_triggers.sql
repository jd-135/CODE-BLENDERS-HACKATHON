-- ====================================================================================
-- SCHOLARHUB (PS78 SAMS) DATABASE HARDENING, RLS SECURITY, CONSTRAINTS & TRIGGERS
-- ====================================================================================

-- 1. Enable Row Level Security (RLS) on all tables
ALTER TABLE IF EXISTS scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ledger_blocks ENABLE ROW LEVEL SECURITY;

-- 2. Constraints and Integrity Validation
-- Ensure GPA is between 0.00 and 10.00
ALTER TABLE IF EXISTS scholarships 
  ADD CONSTRAINT chk_scholarships_min_gpa CHECK (min_gpa >= 0.00 AND min_gpa <= 10.00);

ALTER TABLE IF EXISTS scholarships
  ADD CONSTRAINT chk_scholarships_slots CHECK (total_slots > 0 AND remaining_slots >= 0 AND remaining_slots <= total_slots);

ALTER TABLE IF EXISTS applications
  ADD CONSTRAINT chk_applications_gpa CHECK (student_gpa >= 0.00 AND student_gpa <= 10.00);

ALTER TABLE IF EXISTS applications
  ADD CONSTRAINT chk_applications_status CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED'));

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_scholarships_status ON scholarships(status);
CREATE INDEX IF NOT EXISTS idx_scholarships_category ON scholarships(category);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_scholarship_id ON applications(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_docs_student_id ON vault_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);

-- 4. Atomic Trigger for Automatic Slot Decrement and Auto-Closing
CREATE OR REPLACE FUNCTION handle_application_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- When an application is APPROVED for the first time
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    UPDATE scholarships
    SET 
      remaining_slots = GREATEST(0, remaining_slots - 1),
      status = CASE 
        WHEN remaining_slots - 1 <= 0 THEN 'CLOSED'
        ELSE status 
      END,
      updated_at = NOW()
    WHERE id = NEW.scholarship_id;
  END IF;

  -- When an APPROVED application is revoked or changed to REJECTED
  IF OLD.status = 'APPROVED' AND NEW.status != 'APPROVED' THEN
    UPDATE scholarships
    SET 
      remaining_slots = LEAST(total_slots, remaining_slots + 1),
      status = CASE 
        WHEN status = 'CLOSED' AND remaining_slots + 1 > 0 THEN 'OPEN'
        ELSE status 
      END,
      updated_at = NOW()
    WHERE id = NEW.scholarship_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_app_status_update ON applications;
CREATE TRIGGER trg_app_status_update
AFTER UPDATE OF status ON applications
FOR EACH ROW
EXECUTE FUNCTION handle_application_status_update();

-- 5. Row Level Security Policies
-- Scholarships: Public Read, Staff Write
CREATE POLICY "Public Read Scholarships"
ON scholarships FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admin Full Access Scholarships"
ON scholarships FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' LIKE '%@scholarhub.edu');

-- Applications: Student Own View, Admin Full Review
CREATE POLICY "Student View Own Applications"
ON applications FOR SELECT
TO authenticated
USING (student_id = auth.uid()::text OR student_email = auth.jwt() ->> 'email');

CREATE POLICY "Student Submit Application"
ON applications FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid()::text OR student_email = auth.jwt() ->> 'email');

CREATE POLICY "Admin Full Review Applications"
ON applications FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' LIKE '%@scholarhub.edu');

-- Vault Documents: Student Own Documents
CREATE POLICY "Student Vault Isolation"
ON vault_documents FOR ALL
TO authenticated
USING (student_id = auth.uid()::text OR auth.jwt() ->> 'role' = 'admin');

-- Audit Logs & Ledger: Public Read Verifiable Ledger, Admin Write
CREATE POLICY "Public Read Ledger"
ON ledger_blocks FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public Read Audit Logs"
ON audit_logs FOR SELECT
TO anon, authenticated
USING (true);
