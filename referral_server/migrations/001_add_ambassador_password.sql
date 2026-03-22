ALTER TABLE ambassador
ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_click_referral_ip
ON click(referral_code, ip_address);
