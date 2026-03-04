-- Add results tracking columns to predictions table
ALTER TABLE predictions
ADD COLUMN actual_points numeric;

ALTER TABLE predictions
ADD COLUMN actual_rebounds numeric;

ALTER TABLE predictions
ADD COLUMN actual_assists numeric;

ALTER TABLE predictions
ADD COLUMN hit boolean;

ALTER TABLE predictions
ADD COLUMN error numeric;
