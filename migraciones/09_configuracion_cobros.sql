CREATE TABLE IF NOT EXISTS configuracion_comercio (
 id TINYINT PRIMARY KEY,
 zonaHoraria VARCHAR(80) NOT NULL
) ENGINE=InnoDB;
INSERT IGNORE INTO configuracion_comercio VALUES (1,'America/Argentina/Buenos_Aires');
ALTER TABLE cobros_pos ADD COLUMN IF NOT EXISTS fechaAcreditacion DATETIME NULL;
