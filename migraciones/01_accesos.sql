-- MariaDB 10.4 (XAMPP). El sitio debe estar en mantenimiento durante el despliegue.
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS requiereCambioClave TINYINT(1) NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS sesiones_pos (
 resumenToken BINARY(32) PRIMARY KEY,
 idUsu INT NOT NULL,
 expira DATETIME NOT NULL,
 FOREIGN KEY (idUsu) REFERENCES usuario(idUsu),
 INDEX (expira)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS intentos_acceso_pos (
 clave BINARY(32) PRIMARY KEY,
 inicioVentana DATETIME NOT NULL,
 cantidad INT UNSIGNED NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS auditoria_pos (
 idEvento BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
 idUsu INT NULL,
 accion VARCHAR(100) NOT NULL,
 referencia VARCHAR(100) NULL,
 fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX (idUsu,fecha),
 FOREIGN KEY (idUsu) REFERENCES usuario(idUsu)
) ENGINE=InnoDB;
ALTER TABLE rol_permiso
 ADD COLUMN IF NOT EXISTS puede_ver TINYINT(1) NOT NULL DEFAULT 1,
 ADD COLUMN IF NOT EXISTS puede_crear TINYINT(1) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS puede_modificar TINYINT(1) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS puede_eliminar TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS fechaCreaRol DATETIME NULL;
ALTER TABLE usuario
 ADD COLUMN IF NOT EXISTS fechaNacUsu DATE NULL,
 ADD COLUMN IF NOT EXISTS direccionUsu TEXT NULL;

CREATE TABLE IF NOT EXISTS usuario_permiso_accion (
 idUsu INT NOT NULL,
 idDashPer INT NOT NULL,
 accion ENUM('visualizar','crear','modificar','anular') NOT NULL,
 permitido TINYINT(1) NOT NULL CHECK (permitido IN (0,1)),
 PRIMARY KEY (idUsu,idDashPer,accion),
 FOREIGN KEY (idUsu) REFERENCES usuario(idUsu),
 FOREIGN KEY (idDashPer) REFERENCES dashboard_permisos(idDashPer)
) ENGINE=InnoDB;
INSERT INTO dashboard_permisos(nombreDashPer)
 SELECT 'Caja presencial' WHERE NOT EXISTS (SELECT 1 FROM dashboard_permisos WHERE nombreDashPer='Caja presencial');
INSERT INTO dashboard_permisos(nombreDashPer)
 SELECT 'Comprobantes presenciales' WHERE NOT EXISTS (SELECT 1 FROM dashboard_permisos WHERE nombreDashPer='Comprobantes presenciales');

INSERT INTO usuario_rol(idUsu,idRol)
 SELECT u.idUsu,r.idRol FROM usuario u JOIN roles r ON r.nombreRol=u.rolUsu
 WHERE u.rolUsu IN ('Administrador','Empleado')
 AND NOT EXISTS (SELECT 1 FROM usuario_rol ur WHERE ur.idUsu=u.idUsu);
