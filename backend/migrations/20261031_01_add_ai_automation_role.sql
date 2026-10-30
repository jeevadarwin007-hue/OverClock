-- Apply this file by itself, outside an explicit transaction.
-- PostgreSQL must commit a newly added enum label before the next migration uses it.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AI_AUTOMATION';
