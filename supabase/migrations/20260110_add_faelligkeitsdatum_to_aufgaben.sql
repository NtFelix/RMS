-- Add faelligkeitsdatum (due date) column to Aufgaben table
-- This enables calendar-based task management

ALTER TABLE "Aufgaben" ADD COLUMN IF NOT EXISTS faelligkeitsdatum DATE;

-- Create indexes for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_aufgaben_faelligkeitsdatum ON "Aufgaben" (faelligkeitsdatum);
CREATE INDEX IF NOT EXISTS idx_aufgaben_user_faelligkeitsdatum ON "Aufgaben" (user_id, faelligkeitsdatum);

-- Composite index for calendar view queries (tasks by user and date range)
CREATE INDEX IF NOT EXISTS idx_aufgaben_calendar_view ON "Aufgaben" (user_id, faelligkeitsdatum, ist_erledigt);

COMMENT ON COLUMN "Aufgaben".faelligkeitsdatum IS 'Due date for the task, used in calendar view';
