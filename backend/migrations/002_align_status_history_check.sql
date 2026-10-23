-- ============================================================================
-- Migration: 002_align_status_history_check.sql
-- Description: Aligns status_history check constraint with complaints table
--              by allowing 'Rejected' in addition to existing statuses.
-- Target: Neon PostgreSQL (status_history table)
-- Safety:
--   - Wrapped in an atomic transaction (BEGIN ... COMMIT)
--   - Does NOT drop or rename any columns or tables
--   - Does NOT touch technician.complaint_date or any unrelated objects
--   - Preserves all existing data (0 rows currently in status_history)
-- ============================================================================

BEGIN;

-- 1. Drop existing restrictive check constraint
ALTER TABLE status_history 
  DROP CONSTRAINT IF EXISTS status_history_status_check;

-- 2. Add updated check constraint permitting 'Rejected'
ALTER TABLE status_history 
  ADD CONSTRAINT status_history_status_check 
  CHECK (status IN ('Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected'));

COMMIT;
