CREATE DATABASE IF NOT EXISTS `pujol_e_hijos` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `pujol_e_hijos`;

-- TABLAS BASE PARA USUARIOS (Mantiene compatibilidad con API base)
CREATE TABLE `roles` (
  `idRol` int(11) NOT NULL AUTO_INCREMENT,
  `nombreRol` varchar(50) NOT NULL,
  PRIMARY KEY (`idRol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `roles` (`idRol`, `nombreRol`) VALUES
(1, 'Administrador'),
(2, 'Empleado'),
(3, 'Cliente');

CREATE TABLE `usuario` (
  `idUsu` int(11) NOT NULL AUTO_INCREMENT,
  `nombreUsu` varchar(100) NOT NULL,
  `apellidoUsu` varchar(100) NOT NULL,
  `correoUsu` varchar(150) NOT NULL UNIQUE,
  `usuarioUsu` varchar(50) NOT NULL UNIQUE,
  `contrasenaUsu` varchar(255) NOT NULL,
  `CUILUsu` varchar(20) DEFAULT NULL,
  `telefonoUsu` varchar(20) DEFAULT NULL,
  `estadoUsu` enum('Activo','Inactivo') DEFAULT 'Activo',
  `rolUsu` varchar(50) DEFAULT 'Empleado',
  PRIMARY KEY (`idUsu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `usuario_rol` (
  `idUsu` int(11) NOT NULL,
  `idRol` int(11) NOT NULL,
  PRIMARY KEY (`idUsu`,`idRol`),
  FOREIGN KEY (`idUsu`) REFERENCES `usuario`(`idUsu`) ON DELETE CASCADE,
  FOREIGN KEY (`idRol`) REFERENCES `roles`(`idRol`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `persona` (
  `idPers` int(11) NOT NULL AUTO_INCREMENT,
  `idUsuarioPers` int(11) NOT NULL,
  `direccionFiscalPers` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idPers`),
  FOREIGN KEY (`idUsuarioPers`) REFERENCES `usuario`(`idUsu`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TRIGER PARA SINCRONIZAR PERSONA COMO EN SISTEMA ANTERIOR
DELIMITER $$
CREATE TRIGGER `sync_usuario_to_persona` AFTER INSERT ON `usuario` FOR EACH ROW BEGIN
    INSERT INTO persona (idUsuarioPers) VALUES (NEW.idUsu);
END
$$
DELIMITER ;

-- Insertar usuario admin por defecto (Aldo Pujol)
-- Contraseña en texto plano para el entorno de pruebas
INSERT INTO `usuario` (`idUsu`, `nombreUsu`, `apellidoUsu`, `correoUsu`, `usuarioUsu`, `contrasenaUsu`, `estadoUsu`, `rolUsu`) VALUES
(1, 'Aldo', 'Pujol', 'aldo@pujolehijos.com', 'apujol', 'AldoPujol2026!', 'Activo', 'Administrador');

INSERT INTO `usuario_rol` (`idUsu`, `idRol`) VALUES (1, 1);

-- GESTION DE PRODUCTOS Y STOCK
CREATE TABLE `productos` (
  `idProd` int(11) NOT NULL AUTO_INCREMENT,
  `codigoProd` varchar(50) UNIQUE,
  `nombreProd` varchar(150) NOT NULL,
  `descripcionProd` text,
  `precioUnitario` decimal(10,2) NOT NULL,
  `estadoProd` enum('Activo','Inactivo') DEFAULT 'Activo',
  PRIMARY KEY (`idProd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `inventario` (
  `idInv` int(11) NOT NULL AUTO_INCREMENT,
  `idProd` int(11) NOT NULL UNIQUE,
  `stockActual` int(11) NOT NULL DEFAULT 0,
  `stockMinimo` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`idInv`),
  FOREIGN KEY (`idProd`) REFERENCES `productos`(`idProd`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `movimientos_stock` (
  `idMovStock` int(11) NOT NULL AUTO_INCREMENT,
  `idProd` int(11) NOT NULL,
  `tipoMovimiento` enum('Entrada','Salida','Ajuste') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `fechaMovimiento` datetime DEFAULT CURRENT_TIMESTAMP,
  `idUsu` int(11) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idMovStock`),
  FOREIGN KEY (`idProd`) REFERENCES `productos`(`idProd`),
  FOREIGN KEY (`idUsu`) REFERENCES `usuario`(`idUsu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SISTEMA DE VENTAS
CREATE TABLE `ventas` (
  `idVenta` int(11) NOT NULL AUTO_INCREMENT,
  `fechaVenta` datetime DEFAULT CURRENT_TIMESTAMP,
  `totalVenta` decimal(10,2) NOT NULL,
  `idUsu` int(11) NOT NULL,
  `estadoVenta` enum('Completada','Anulada') DEFAULT 'Completada',
  PRIMARY KEY (`idVenta`),
  FOREIGN KEY (`idUsu`) REFERENCES `usuario`(`idUsu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `detalle_venta` (
  `idDetalle` int(11) NOT NULL AUTO_INCREMENT,
  `idVenta` int(11) NOT NULL,
  `idProd` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precioUnitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`idDetalle`),
  FOREIGN KEY (`idVenta`) REFERENCES `ventas`(`idVenta`) ON DELETE CASCADE,
  FOREIGN KEY (`idProd`) REFERENCES `productos`(`idProd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- CAJA (MOVIMIENTOS Y RENDICION)
CREATE TABLE `caja_turnos` (
  `idTurno` int(11) NOT NULL AUTO_INCREMENT,
  `fechaApertura` datetime DEFAULT CURRENT_TIMESTAMP,
  `fechaCierre` datetime DEFAULT NULL,
  `montoInicial` decimal(10,2) NOT NULL,
  `montoFinal` decimal(10,2) DEFAULT NULL,
  `diferencia` decimal(10,2) DEFAULT NULL,
  `idUsu` int(11) NOT NULL,
  `estadoTurno` enum('Abierto','Cerrado') DEFAULT 'Abierto',
  PRIMARY KEY (`idTurno`),
  FOREIGN KEY (`idUsu`) REFERENCES `usuario`(`idUsu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `movimientos_caja` (
  `idMovCaja` int(11) NOT NULL AUTO_INCREMENT,
  `idTurno` int(11) NOT NULL,
  `tipoMovimiento` enum('Ingreso','Egreso') NOT NULL,
  `concepto` varchar(150) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `fechaMovimiento` datetime DEFAULT CURRENT_TIMESTAMP,
  `idUsu` int(11) NOT NULL,
  `idVenta` int(11) DEFAULT NULL,
  PRIMARY KEY (`idMovCaja`),
  FOREIGN KEY (`idTurno`) REFERENCES `caja_turnos`(`idTurno`),
  FOREIGN KEY (`idUsu`) REFERENCES `usuario`(`idUsu`),
  FOREIGN KEY (`idVenta`) REFERENCES `ventas`(`idVenta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- COMPROBANTES
CREATE TABLE `comprobantes` (
  `idComp` int(11) NOT NULL AUTO_INCREMENT,
  `tipoComp` enum('Factura A','Factura B','Factura C','Ticket') NOT NULL,
  `numeroComp` varchar(50) NOT NULL UNIQUE,
  `fechaEmision` datetime DEFAULT CURRENT_TIMESTAMP,
  `idVenta` int(11) NOT NULL,
  `totalComp` decimal(10,2) NOT NULL,
  PRIMARY KEY (`idComp`),
  FOREIGN KEY (`idVenta`) REFERENCES `ventas`(`idVenta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DATOS DE PRUEBA
INSERT IGNORE INTO `productos` (`idProd`, `codigoProd`, `nombreProd`, `descripcionProd`, `precioUnitario`, `estadoProd`) VALUES
(1, 'BEB-001', 'Coca-Cola 2.25L Retornable', 'Gaseosa Cola 2.25L envase retornable', 2100.00, 'Activo'),
(2, 'BEB-002', 'Sprite 2.25L Retornable', 'Gaseosa Lima Limón 2.25L envase retornable', 2100.00, 'Activo'),
(3, 'BEB-003', 'Agua Mineral Kin 1.5L', 'Agua mineral sin gas 1.5L', 1200.00, 'Activo'),
(4, 'BEB-004', 'Cepita Naranja 1L', 'Jugo de naranja envasado 1L', 1800.00, 'Activo'),
(5, 'BEB-005', 'Powerade Mountain Blast 500ml', 'Bebida deportiva sabor azul 500ml', 1500.00, 'Activo');

INSERT IGNORE INTO `inventario` (`idProd`, `stockActual`, `stockMinimo`) VALUES
(1, 150, 50),
(2, 80, 30),
(3, 300, 100),
(4, 120, 40),
(5, 500, 150);

INSERT IGNORE INTO `caja_turnos` (`idTurno`, `montoInicial`, `fechaApertura`, `idUsu`, `estadoTurno`) VALUES
(1, 10000.00, NOW(), 1, 'Abierto');

INSERT IGNORE INTO `usuario` (`idUsu`, `nombreUsu`, `apellidoUsu`, `correoUsu`, `usuarioUsu`, `contrasenaUsu`, `estadoUsu`, `rolUsu`) VALUES
(2, 'Juan', 'Perez', 'empleado@pujolehijos.com', 'juanp', 'Pujol2026!', 'Activo', 'Empleado'),
(3, 'Maria', 'Gomez', 'cliente@gmail.com', 'mariag', 'Pujol2026!', 'Activo', 'Cliente');

INSERT IGNORE INTO `usuario_rol` (`idUsu`, `idRol`) VALUES
(2, 2),
(3, 3);
