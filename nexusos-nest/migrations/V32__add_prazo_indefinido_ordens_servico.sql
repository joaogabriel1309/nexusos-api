ALTER TABLE ordens_servico
    ADD COLUMN prazo_indefinido boolean NOT NULL DEFAULT false;

UPDATE ordens_servico
SET prazo_indefinido = true
WHERE prazo IS NULL;

ALTER TABLE ordens_servico
    ADD CONSTRAINT chk_ordens_servico_prazo_indefinido
        CHECK (NOT prazo_indefinido OR prazo IS NULL);
