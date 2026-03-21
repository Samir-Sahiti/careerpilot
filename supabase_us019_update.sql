-- Run this in your Supabase SQL Editor to apply the changes for US-019
ALTER TABLE interview_sessions 
  ADD COLUMN overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100);
