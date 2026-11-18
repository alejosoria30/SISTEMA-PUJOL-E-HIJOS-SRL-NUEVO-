ALTER TABLE productos ADD COLUMN IF NOT EXISTS minimoMayorista DECIMAL(11,3) NULL CHECK (minimoMayorista > 0);
