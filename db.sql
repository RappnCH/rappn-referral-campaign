-- 1. Tabella per gestire gli Ambassador
CREATE TABLE ambassador (
    id SERIAL PRIMARY KEY,
    referral_code VARCHAR(50) UNIQUE NOT NULL, -- Es: 'mario_rossi'
    name VARCHAR(100),                         -- Nome vero (opzionale)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabella per tracciare i singoli Clic
CREATE TABLE click (
    id SERIAL PRIMARY KEY,
    referral_code VARCHAR(50) REFERENCES ambassador(referral_code),
    ip_address INET,                           -- Tipo specifico di Postgres per gli IP
    is_swiss BOOLEAN NOT NULL DEFAULT FALSE,   -- Vero se l'IP è svizzero
    user_agent TEXT,                           -- Browser/Dispositivo usato
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indice per velocizzare le ricerche future (es. contare i clic di un ambassador)
CREATE INDEX idx_click_referral ON click(referral_code);

-- Un solo clic conteggiato per referral + IP
CREATE UNIQUE INDEX uq_click_referral_ip ON click(referral_code, ip_address);