CREATE TABLE IF NOT EXISTS medios_cobro (
 codigo VARCHAR(24) PRIMARY KEY,
 esEfectivo TINYINT(1) NOT NULL,
 activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO medios_cobro(codigo,esEfectivo) VALUES
 ('efectivo',1),('transferencia',0),('mercado_pago',0)
 ON DUPLICATE KEY UPDATE codigo=VALUES(codigo);
-- El historial anterior puede carecer de evidencia del medio utilizado.
CREATE TABLE IF NOT EXISTS cobros_pos (
 idCobro BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
 claveOperacion CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 huellaSolicitud CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 idVenta INT NULL UNIQUE,
 idUsu INT NOT NULL,
 idTurno INT NOT NULL,
 medio VARCHAR(24) NOT NULL,
 importe DECIMAL(10,2) NOT NULL CHECK (importe > 0),
 moneda CHAR(3) NOT NULL DEFAULT 'ARS',
 estado ENUM('pendiente','aprobado','rechazado','cancelado','reembolsado') NOT NULL DEFAULT 'pendiente',
 creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 actualizado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (idVenta) REFERENCES ventas(idVenta),
 FOREIGN KEY (idUsu) REFERENCES usuario(idUsu),
 FOREIGN KEY (idTurno) REFERENCES caja_turnos(idTurno),
 FOREIGN KEY (medio) REFERENCES medios_cobro(codigo),
 INDEX (idTurno,medio,estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS reservas_pos (
 idCobro BIGINT UNSIGNED NOT NULL,
 idProd INT NOT NULL,
 cantidad DECIMAL(14,3) NOT NULL CHECK(cantidad > 0),
 precioUnitario DECIMAL(10,2) NOT NULL,
 estado ENUM('reservada','consumida','liberada') NOT NULL DEFAULT 'reservada',
 PRIMARY KEY(idCobro,idProd),
 INDEX(idProd,estado),
 FOREIGN KEY(idCobro) REFERENCES cobros_pos(idCobro),
 FOREIGN KEY(idProd) REFERENCES productos(idProd)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS cuentas_mp (
 idCuenta INT PRIMARY KEY AUTO_INCREMENT,
 vendedorExterno VARCHAR(80) NOT NULL UNIQUE,
 credencialesCifradas BLOB NULL,
 expira DATETIME NULL,
 activa TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS cajas_mp (
 idCaja INT PRIMARY KEY AUTO_INCREMENT,
 idCuenta INT NOT NULL,
 externalPosId VARCHAR(100) NOT NULL,
 activa TINYINT(1) NOT NULL DEFAULT 1,
 UNIQUE(idCuenta,externalPosId),
 FOREIGN KEY(idCuenta) REFERENCES cuentas_mp(idCuenta)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS ordenes_mp (
 idCobro BIGINT UNSIGNED PRIMARY KEY,
 idCaja INT NOT NULL,
 ordenExterna VARCHAR(100) NULL UNIQUE,
 pagoExterno VARCHAR(100) NULL UNIQUE,
 estadoProveedor VARCHAR(64) NULL,
 detalleEstado VARCHAR(128) NULL,
 ultimaVerificacion DATETIME NULL,
 FOREIGN KEY(idCobro) REFERENCES cobros_pos(idCobro),
 FOREIGN KEY(idCaja) REFERENCES cajas_mp(idCaja)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS reembolsos_mp (
 referencia VARCHAR(100) PRIMARY KEY,
 idCobro BIGINT UNSIGNED NOT NULL,
 importe DECIMAL(10,2) NOT NULL CHECK(importe > 0),
 verificado DATETIME NOT NULL,
 FOREIGN KEY(idCobro) REFERENCES ordenes_mp(idCobro)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS oauth_mp (
 resumen BINARY(32) PRIMARY KEY,
 idUsu INT NOT NULL,
 verificador CHAR(64) NOT NULL,
 expira DATETIME NOT NULL,
 FOREIGN KEY(idUsu) REFERENCES usuario(idUsu),
 INDEX(expira)
) ENGINE=InnoDB;
