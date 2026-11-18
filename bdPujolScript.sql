-- SOLO para una base VACIA. Seleccione la base en phpMyAdmin. En una base existente use migraciones/00 a 04.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

CREATE TABLE `caja_turnos` (
  `idTurno` int(11) NOT NULL,
  `fechaApertura` datetime DEFAULT current_timestamp(),
  `fechaCierre` datetime DEFAULT NULL,
  `montoInicial` decimal(10,2) NOT NULL,
  `montoFinal` decimal(10,2) DEFAULT NULL,
  `diferencia` decimal(10,2) DEFAULT NULL,
  `idUsu` int(11) NOT NULL,
  `estadoTurno` enum('Abierto','Cerrado') DEFAULT 'Abierto'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `comprobantes` (
  `idComp` int(11) NOT NULL,
  `tipoComp` enum('Factura A','Factura B','Factura C','Ticket') NOT NULL,
  `numeroComp` varchar(50) NOT NULL,
  `fechaEmision` datetime DEFAULT current_timestamp(),
  `idVenta` int(11) NOT NULL,
  `totalComp` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `dashboard_permisos` (
  `idDashPer` int(11) NOT NULL,
  `nombreDashPer` varchar(100) NOT NULL,
  `fechaCreaDashPer` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `dashboard_permisos` (`idDashPer`, `nombreDashPer`, `fechaCreaDashPer`) VALUES
(1, 'Acceder al Dashboard', '2026-10-13 11:46:33'),
(2, 'Gestionar Stock', '2026-10-13 11:46:33'),
(3, 'Gestionar Recetas', '2026-10-13 11:46:33'),
(4, 'Gestionar Pedidos', '2026-10-13 11:46:33'),
(5, 'Gestionar Ventas', '2026-10-13 11:46:33'),
(6, 'Gestionar Clientes', '2026-10-13 11:46:33'),
(7, 'Gestionar Roles', '2026-10-13 11:46:33'),
(8, 'Ver Historial de Ventas', '2026-10-13 11:46:33'),
(9, 'Modificar Mi Perfil', '2026-10-13 11:46:33');

CREATE TABLE `detalle_venta` (
  `idDetalle` int(11) NOT NULL,
  `idVenta` int(11) NOT NULL,
  `idProd` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL,
  `precioUnitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `inventario` (
  `idInv` int(11) NOT NULL,
  `idProd` int(11) NOT NULL,
  `stockActual` int(11) NOT NULL DEFAULT 0,
  `stockMinimo` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `movimientos_caja` (
  `idMovCaja` int(11) NOT NULL,
  `idTurno` int(11) NOT NULL,
  `tipoMovimiento` enum('Ingreso','Egreso') NOT NULL,
  `concepto` varchar(150) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `fechaMovimiento` datetime DEFAULT current_timestamp(),
  `idUsu` int(11) NOT NULL,
  `idVenta` int(11) DEFAULT NULL,
  `requestKey` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `movimientos_stock` (
  `idMovStock` int(11) NOT NULL,
  `idProd` int(11) NOT NULL,
  `tipoMovimiento` enum('Entrada','Salida','Ajuste') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `fechaMovimiento` datetime DEFAULT current_timestamp(),
  `idUsu` int(11) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `persona` (
  `idPers` int(11) NOT NULL,
  `idUsuarioPers` int(11) NOT NULL,
  `direccionFiscalPers` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `productos` (
  `idProd` int(11) NOT NULL,
  `codigoProd` varchar(50) DEFAULT NULL,
  `nombreProd` varchar(150) NOT NULL,
  `descripcionProd` text DEFAULT NULL,
  `precioUnitario` decimal(10,2) NOT NULL,
  `estadoProd` enum('Activo','Inactivo') DEFAULT 'Activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `roles` (
  `idRol` int(11) NOT NULL,
  `nombreRol` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `roles` (`idRol`, `nombreRol`) VALUES
(1, 'Administrador'),
(2, 'Empleado'),
(3, 'Cliente');

CREATE TABLE `rol_permiso` (
  `idRol` int(11) NOT NULL,
  `idDashPer` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `rol_permiso` (`idRol`, `idDashPer`) VALUES
(1, 8),
(1, 9),
(2, 8);

CREATE TABLE `usuario` (
  `idUsu` int(11) NOT NULL,
  `nombreUsu` varchar(100) NOT NULL,
  `apellidoUsu` varchar(100) NOT NULL,
  `correoUsu` varchar(150) NOT NULL,
  `usuarioUsu` varchar(50) NOT NULL,
  `contrasenaUsu` varchar(255) NOT NULL,
  `CUILUsu` varchar(20) DEFAULT NULL,
  `telefonoUsu` varchar(20) DEFAULT NULL,
  `estadoUsu` enum('Activo','Inactivo') DEFAULT 'Activo',
  `rolUsu` enum('Administrador','Empleado','Cliente') NOT NULL DEFAULT 'Cliente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DELIMITER $$
CREATE TRIGGER `sync_usuario_to_persona` AFTER INSERT ON `usuario` FOR EACH ROW BEGIN
    INSERT INTO persona (idUsuarioPers) VALUES (NEW.idUsu);
END
$$
DELIMITER ;

CREATE TABLE `usuario_rol` (
  `idUsu` int(11) NOT NULL,
  `idRol` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `ventas` (
  `idVenta` int(11) NOT NULL,
  `fechaVenta` datetime DEFAULT current_timestamp(),
  `totalVenta` decimal(10,2) NOT NULL,
  `idUsu` int(11) NOT NULL,
  `estadoVenta` enum('Completada','Anulada') DEFAULT 'Completada'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `caja_turnos`
  ADD PRIMARY KEY (`idTurno`),
  ADD KEY `idUsu` (`idUsu`);

ALTER TABLE `comprobantes`
  ADD PRIMARY KEY (`idComp`),
  ADD UNIQUE KEY `numeroComp` (`numeroComp`),
  ADD KEY `idVenta` (`idVenta`);

ALTER TABLE `dashboard_permisos`
  ADD PRIMARY KEY (`idDashPer`),
  ADD UNIQUE KEY `uk_dashboard_permisos_nombre` (`nombreDashPer`);

ALTER TABLE `detalle_venta`
  ADD PRIMARY KEY (`idDetalle`),
  ADD KEY `idVenta` (`idVenta`),
  ADD KEY `idProd` (`idProd`);

ALTER TABLE `inventario`
  ADD PRIMARY KEY (`idInv`),
  ADD UNIQUE KEY `idProd` (`idProd`);

ALTER TABLE `movimientos_caja`
  ADD PRIMARY KEY (`idMovCaja`),
  ADD UNIQUE KEY `uk_movimientos_caja_requestKey` (`requestKey`),
  ADD KEY `idTurno` (`idTurno`),
  ADD KEY `idUsu` (`idUsu`),
  ADD KEY `idVenta` (`idVenta`);

ALTER TABLE `movimientos_stock`
  ADD PRIMARY KEY (`idMovStock`),
  ADD KEY `idProd` (`idProd`),
  ADD KEY `idUsu` (`idUsu`);

ALTER TABLE `persona`
  ADD PRIMARY KEY (`idPers`),
  ADD KEY `idUsuarioPers` (`idUsuarioPers`);

ALTER TABLE `productos`
  ADD PRIMARY KEY (`idProd`),
  ADD UNIQUE KEY `codigoProd` (`codigoProd`);

ALTER TABLE `roles`
  ADD PRIMARY KEY (`idRol`);

ALTER TABLE `rol_permiso`
  ADD PRIMARY KEY (`idRol`,`idDashPer`),
  ADD KEY `idDashPer` (`idDashPer`);

ALTER TABLE `usuario`
  ADD PRIMARY KEY (`idUsu`),
  ADD UNIQUE KEY `correoUsu` (`correoUsu`),
  ADD UNIQUE KEY `usuarioUsu` (`usuarioUsu`);

ALTER TABLE `usuario_rol`
  ADD PRIMARY KEY (`idUsu`,`idRol`),
  ADD KEY `idRol` (`idRol`);

ALTER TABLE `ventas`
  ADD PRIMARY KEY (`idVenta`),
  ADD KEY `idUsu` (`idUsu`);

ALTER TABLE `caja_turnos`
  MODIFY `idTurno` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

ALTER TABLE `comprobantes`
  MODIFY `idComp` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `dashboard_permisos`
  MODIFY `idDashPer` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

ALTER TABLE `detalle_venta`
  MODIFY `idDetalle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

ALTER TABLE `inventario`
  MODIFY `idInv` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

ALTER TABLE `movimientos_caja`
  MODIFY `idMovCaja` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

ALTER TABLE `movimientos_stock`
  MODIFY `idMovStock` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `persona`
  MODIFY `idPers` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

ALTER TABLE `productos`
  MODIFY `idProd` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

ALTER TABLE `roles`
  MODIFY `idRol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

ALTER TABLE `usuario`
  MODIFY `idUsu` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

ALTER TABLE `ventas`
  MODIFY `idVenta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

ALTER TABLE `caja_turnos`
  ADD CONSTRAINT `caja_turnos_ibfk_1` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`);

ALTER TABLE `comprobantes`
  ADD CONSTRAINT `comprobantes_ibfk_1` FOREIGN KEY (`idVenta`) REFERENCES `ventas` (`idVenta`);

ALTER TABLE `detalle_venta`
  ADD CONSTRAINT `detalle_venta_ibfk_1` FOREIGN KEY (`idVenta`) REFERENCES `ventas` (`idVenta`) ON DELETE CASCADE,
  ADD CONSTRAINT `detalle_venta_ibfk_2` FOREIGN KEY (`idProd`) REFERENCES `productos` (`idProd`);

ALTER TABLE `inventario`
  ADD CONSTRAINT `inventario_ibfk_1` FOREIGN KEY (`idProd`) REFERENCES `productos` (`idProd`) ON DELETE CASCADE;

ALTER TABLE `movimientos_caja`
  ADD CONSTRAINT `movimientos_caja_ibfk_1` FOREIGN KEY (`idTurno`) REFERENCES `caja_turnos` (`idTurno`),
  ADD CONSTRAINT `movimientos_caja_ibfk_2` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`),
  ADD CONSTRAINT `movimientos_caja_ibfk_3` FOREIGN KEY (`idVenta`) REFERENCES `ventas` (`idVenta`);

ALTER TABLE `movimientos_stock`
  ADD CONSTRAINT `movimientos_stock_ibfk_1` FOREIGN KEY (`idProd`) REFERENCES `productos` (`idProd`),
  ADD CONSTRAINT `movimientos_stock_ibfk_2` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`);

ALTER TABLE `persona`
  ADD CONSTRAINT `persona_ibfk_1` FOREIGN KEY (`idUsuarioPers`) REFERENCES `usuario` (`idUsu`) ON DELETE CASCADE;

ALTER TABLE `rol_permiso`
  ADD CONSTRAINT `rol_permiso_ibfk_1` FOREIGN KEY (`idRol`) REFERENCES `roles` (`idRol`) ON DELETE CASCADE,
  ADD CONSTRAINT `rol_permiso_ibfk_2` FOREIGN KEY (`idDashPer`) REFERENCES `dashboard_permisos` (`idDashPer`) ON DELETE CASCADE;

ALTER TABLE `usuario_rol`
  ADD CONSTRAINT `usuario_rol_ibfk_1` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`) ON DELETE CASCADE,
  ADD CONSTRAINT `usuario_rol_ibfk_2` FOREIGN KEY (`idRol`) REFERENCES `roles` (`idRol`) ON DELETE CASCADE;

ALTER TABLE `ventas`
  ADD CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
