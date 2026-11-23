-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: pujol_e_hijos
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `arqueos_pos`
--

DROP TABLE IF EXISTS `arqueos_pos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `arqueos_pos` (
  `idTurno` int(11) NOT NULL,
  `idUsu` int(11) NOT NULL,
  `billetes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`billetes`)),
  `otros` decimal(10,2) NOT NULL,
  `observaciones` varchar(500) NOT NULL,
  PRIMARY KEY (`idTurno`),
  KEY `idUsu` (`idUsu`),
  CONSTRAINT `arqueos_pos_ibfk_1` FOREIGN KEY (`idTurno`) REFERENCES `caja_turnos` (`idTurno`),
  CONSTRAINT `arqueos_pos_ibfk_2` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `arqueos_pos`
--

LOCK TABLES `arqueos_pos` WRITE;
/*!40000 ALTER TABLE `arqueos_pos` DISABLE KEYS */;
INSERT INTO `arqueos_pos` VALUES (8,1,'{\"100\":100,\"200\":0,\"500\":0,\"1000\":0,\"2000\":0,\"10000\":0,\"20000\":10}',0.00,'');
/*!40000 ALTER TABLE `arqueos_pos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auditoria_pos`
--

DROP TABLE IF EXISTS `auditoria_pos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `auditoria_pos` (
  `idEvento` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `idUsu` int(11) DEFAULT NULL,
  `accion` varchar(100) NOT NULL,
  `referencia` varchar(100) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`idEvento`),
  KEY `idUsu` (`idUsu`,`fecha`),
  KEY `idx_auditoria_usuario_fecha` (`idUsu`,`idEvento`),
  CONSTRAINT `auditoria_pos_ibfk_1` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria_pos`
--

LOCK TABLES `auditoria_pos` WRITE;
/*!40000 ALTER TABLE `auditoria_pos` DISABLE KEYS */;
INSERT INTO `auditoria_pos` VALUES (1,1,'POST /mp/configuracion','','2026-11-18 01:25:33'),(2,1,'POST /categorias','','2026-11-18 01:26:02'),(3,1,'POST /categorias','','2026-11-18 01:26:04'),(4,1,'POST /categorias','','2026-11-18 04:22:48'),(5,1,'POST /mp/configuracion','','2026-11-18 04:25:39'),(6,1,'POST /configuracion','','2026-11-18 04:26:13'),(7,1,'Marcar venta de prueba','4','2026-11-18 04:56:19'),(8,1,'DELETE /roles','','2026-11-18 05:14:41'),(9,1,'DELETE /roles','','2026-11-18 05:14:53');
/*!40000 ALTER TABLE `auditoria_pos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `caja_turnos`
--

DROP TABLE IF EXISTS `caja_turnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `caja_turnos` (
  `idTurno` int(11) NOT NULL AUTO_INCREMENT,
  `fechaApertura` datetime DEFAULT current_timestamp(),
  `fechaCierre` datetime DEFAULT NULL,
  `montoInicial` decimal(10,2) NOT NULL,
  `montoFinal` decimal(10,2) DEFAULT NULL,
  `diferencia` decimal(10,2) DEFAULT NULL,
  `idUsu` int(11) NOT NULL,
  `estadoTurno` enum('Abierto','Cerrado') DEFAULT 'Abierto',
  PRIMARY KEY (`idTurno`),
  KEY `idUsu` (`idUsu`),
  CONSTRAINT `caja_turnos_ibfk_1` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `caja_turnos`
--

LOCK TABLES `caja_turnos` WRITE;
/*!40000 ALTER TABLE `caja_turnos` DISABLE KEYS */;
INSERT INTO `caja_turnos` VALUES (1,'2026-10-13 11:23:39','2026-10-20 16:12:06',10000.00,115000.00,0.00,1,'Cerrado'),(4,'2026-11-12 00:44:23','2026-11-12 00:49:26',50.00,450.00,0.00,1,'Cerrado'),(7,'2026-11-12 01:41:58','2026-11-12 01:42:52',53.00,53.00,0.00,1,'Cerrado'),(8,'2026-11-18 04:25:12','2026-11-18 05:45:20',0.00,210000.00,210000.00,1,'Cerrado');
/*!40000 ALTER TABLE `caja_turnos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cajas_mp`
--

DROP TABLE IF EXISTS `cajas_mp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cajas_mp` (
  `idCaja` int(11) NOT NULL AUTO_INCREMENT,
  `idCuenta` int(11) NOT NULL,
  `externalPosId` varchar(100) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idCaja`),
  UNIQUE KEY `idCuenta` (`idCuenta`,`externalPosId`),
  CONSTRAINT `cajas_mp_ibfk_1` FOREIGN KEY (`idCuenta`) REFERENCES `cuentas_mp` (`idCuenta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cajas_mp`
--

LOCK TABLES `cajas_mp` WRITE;
/*!40000 ALTER TABLE `cajas_mp` DISABLE KEYS */;
/*!40000 ALTER TABLE `cajas_mp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categorias_producto`
--

DROP TABLE IF EXISTS `categorias_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categorias_producto` (
  `idCategoria` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idCategoria`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias_producto`
--

LOCK TABLES `categorias_producto` WRITE;
/*!40000 ALTER TABLE `categorias_producto` DISABLE KEYS */;
INSERT INTO `categorias_producto` VALUES (1,'Picadillo',1),(2,'Bebidas',1);
/*!40000 ALTER TABLE `categorias_producto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cobros_pos`
--

DROP TABLE IF EXISTS `cobros_pos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cobros_pos` (
  `idCobro` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `claveOperacion` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `huellaSolicitud` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `idVenta` int(11) DEFAULT NULL,
  `idUsu` int(11) NOT NULL,
  `idTurno` int(11) NOT NULL,
  `medio` varchar(24) NOT NULL,
  `tipoVenta` enum('mayorista','minorista') DEFAULT NULL,
  `importe` decimal(10,2) NOT NULL CHECK (`importe` > 0),
  `moneda` char(3) NOT NULL DEFAULT 'ARS',
  `estado` enum('pendiente','aprobado','rechazado','cancelado','reembolsado') NOT NULL DEFAULT 'pendiente',
  `creado` datetime NOT NULL DEFAULT current_timestamp(),
  `actualizado` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fechaAcreditacion` datetime DEFAULT NULL,
  PRIMARY KEY (`idCobro`),
  UNIQUE KEY `claveOperacion` (`claveOperacion`),
  UNIQUE KEY `idVenta` (`idVenta`),
  KEY `idUsu` (`idUsu`),
  KEY `medio` (`medio`),
  KEY `idTurno` (`idTurno`,`medio`,`estado`),
  CONSTRAINT `cobros_pos_ibfk_1` FOREIGN KEY (`idVenta`) REFERENCES `ventas` (`idVenta`),
  CONSTRAINT `cobros_pos_ibfk_2` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`),
  CONSTRAINT `cobros_pos_ibfk_3` FOREIGN KEY (`idTurno`) REFERENCES `caja_turnos` (`idTurno`),
  CONSTRAINT `cobros_pos_ibfk_4` FOREIGN KEY (`medio`) REFERENCES `medios_cobro` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cobros_pos`
--

LOCK TABLES `cobros_pos` WRITE;
/*!40000 ALTER TABLE `cobros_pos` DISABLE KEYS */;
INSERT INTO `cobros_pos` VALUES (1,'de47e85a-d114-4c72-934f-4fa85a4bc2ae','caf756b9bcda1bf01dd8634a8250755e02f0e6c48c4b3dc492d54cfb64493b75',4,1,8,'transferencia','minorista',5000.00,'ARS','aprobado','2026-11-18 04:28:09','2026-11-18 04:28:09','2026-11-18 04:28:09');
/*!40000 ALTER TABLE `cobros_pos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comprobantes`
--

DROP TABLE IF EXISTS `comprobantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `comprobantes` (
  `idComp` int(11) NOT NULL AUTO_INCREMENT,
  `tipoComp` enum('Factura A','Factura B','Factura C','Ticket') NOT NULL,
  `numeroComp` varchar(50) NOT NULL,
  `fechaEmision` datetime DEFAULT current_timestamp(),
  `idVenta` int(11) NOT NULL,
  `totalComp` decimal(10,2) NOT NULL,
  PRIMARY KEY (`idComp`),
  UNIQUE KEY `numeroComp` (`numeroComp`),
  KEY `idVenta` (`idVenta`),
  CONSTRAINT `comprobantes_ibfk_1` FOREIGN KEY (`idVenta`) REFERENCES `ventas` (`idVenta`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comprobantes`
--

LOCK TABLES `comprobantes` WRITE;
/*!40000 ALTER TABLE `comprobantes` DISABLE KEYS */;
INSERT INTO `comprobantes` VALUES (1,'Factura C','C-0001-00000001','2026-11-18 04:21:08',1,105000.00);
/*!40000 ALTER TABLE `comprobantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_comercio`
--

DROP TABLE IF EXISTS `configuracion_comercio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `configuracion_comercio` (
  `id` tinyint(4) NOT NULL,
  `zonaHoraria` varchar(80) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_comercio`
--

LOCK TABLES `configuracion_comercio` WRITE;
/*!40000 ALTER TABLE `configuracion_comercio` DISABLE KEYS */;
INSERT INTO `configuracion_comercio` VALUES (1,'America/Argentina/Buenos_Aires');
/*!40000 ALTER TABLE `configuracion_comercio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cuentas_mp`
--

DROP TABLE IF EXISTS `cuentas_mp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cuentas_mp` (
  `idCuenta` int(11) NOT NULL AUTO_INCREMENT,
  `vendedorExterno` varchar(80) NOT NULL,
  `credencialesCifradas` blob DEFAULT NULL,
  `expira` datetime DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`idCuenta`),
  UNIQUE KEY `vendedorExterno` (`vendedorExterno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cuentas_mp`
--

LOCK TABLES `cuentas_mp` WRITE;
/*!40000 ALTER TABLE `cuentas_mp` DISABLE KEYS */;
/*!40000 ALTER TABLE `cuentas_mp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dashboard_permisos`
--

DROP TABLE IF EXISTS `dashboard_permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dashboard_permisos` (
  `idDashPer` int(11) NOT NULL AUTO_INCREMENT,
  `nombreDashPer` varchar(100) NOT NULL,
  `fechaCreaDashPer` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`idDashPer`),
  UNIQUE KEY `uk_dashboard_permisos_nombre` (`nombreDashPer`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dashboard_permisos`
--

LOCK TABLES `dashboard_permisos` WRITE;
/*!40000 ALTER TABLE `dashboard_permisos` DISABLE KEYS */;
INSERT INTO `dashboard_permisos` VALUES (1,'Acceder al Dashboard','2026-10-13 11:46:33'),(2,'Gestionar Stock','2026-10-13 11:46:33'),(3,'Gestionar Recetas','2026-10-13 11:46:33'),(4,'Gestionar Pedidos','2026-10-13 11:46:33'),(5,'Gestionar Ventas','2026-10-13 11:46:33'),(6,'Gestionar Clientes','2026-10-13 11:46:33'),(7,'Gestionar Roles','2026-10-13 11:46:33'),(8,'Ver Historial de Ventas','2026-10-13 11:46:33'),(9,'Modificar Mi Perfil','2026-10-13 11:46:33'),(10,'Caja presencial','2026-11-18 00:44:50'),(11,'Comprobantes presenciales','2026-11-18 00:44:50'),(12,'Cat√°logo de productos','2026-11-18 04:18:00'),(13,'Clasificaci√≥n de productos','2026-11-18 04:18:00'),(14,'Cobros QR','2026-11-18 04:18:00'),(15,'Ajustar cantidad de stock','2026-11-18 05:14:03'),(16,'Ver movimientos de stock','2026-11-18 05:43:12'),(17,'Registrar entradas de stock','2026-11-18 05:43:12'),(18,'Registrar salidas de stock','2026-11-18 05:43:12'),(19,'Ver historial de caja','2026-11-18 05:43:12');
/*!40000 ALTER TABLE `dashboard_permisos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_venta`
--

DROP TABLE IF EXISTS `detalle_venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `detalle_venta` (
  `idDetalle` int(11) NOT NULL AUTO_INCREMENT,
  `idVenta` int(11) NOT NULL,
  `idProd` int(11) NOT NULL,
  `cantidad` decimal(14,3) NOT NULL,
  `precioUnitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`idDetalle`),
  KEY `idVenta` (`idVenta`),
  KEY `idProd` (`idProd`),
  CONSTRAINT `detalle_venta_ibfk_1` FOREIGN KEY (`idVenta`) REFERENCES `ventas` (`idVenta`) ON DELETE CASCADE,
  CONSTRAINT `detalle_venta_ibfk_2` FOREIGN KEY (`idProd`) REFERENCES `productos` (`idProd`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_venta`
--

LOCK TABLES `detalle_venta` WRITE;
/*!40000 ALTER TABLE `detalle_venta` DISABLE KEYS */;
INSERT INTO `detalle_venta` VALUES (2,2,12,50.000,10.00,500.00),(3,3,12,50.000,10.00,500.00),(4,4,1,2.000,2500.00,5000.00);
/*!40000 ALTER TABLE `detalle_venta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `intentos_acceso_pos`
--

DROP TABLE IF EXISTS `intentos_acceso_pos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `intentos_acceso_pos` (
  `clave` binary(32) NOT NULL,
  `inicioVentana` datetime NOT NULL,
  `cantidad` int(10) unsigned NOT NULL,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `intentos_acceso_pos`
--

LOCK TABLES `intentos_acceso_pos` WRITE;
/*!40000 ALTER TABLE `intentos_acceso_pos` DISABLE KEYS */;
INSERT INTO `intentos_acceso_pos` VALUES ('\"zõ-ÄPµT#\'†\Z,Ø\'çv\\\\;vöq%th','2026-11-18 20:06:17',1),('%ú˜À<‹Q‹Œgw◊HÊ…rOÑù%6æá	πÙCZ\0','2026-11-18 14:31:11',1);
/*!40000 ALTER TABLE `intentos_acceso_pos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventario`
--

DROP TABLE IF EXISTS `inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventario` (
  `idInv` int(11) NOT NULL AUTO_INCREMENT,
  `idProd` int(11) NOT NULL,
  `stockActual` decimal(14,3) NOT NULL DEFAULT 0.000,
  `stockMinimo` decimal(14,3) NOT NULL DEFAULT 0.000,
  PRIMARY KEY (`idInv`),
  UNIQUE KEY `idProd` (`idProd`),
  CONSTRAINT `inventario_ibfk_1` FOREIGN KEY (`idProd`) REFERENCES `productos` (`idProd`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventario`
--

LOCK TABLES `inventario` WRITE;
/*!40000 ALTER TABLE `inventario` DISABLE KEYS */;
INSERT INTO `inventario` VALUES (1,1,99.000,50.000),(9,12,0.000,20.000);
/*!40000 ALTER TABLE `inventario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `medios_cobro`
--

DROP TABLE IF EXISTS `medios_cobro`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `medios_cobro` (
  `codigo` varchar(24) NOT NULL,
  `esEfectivo` tinyint(1) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `medios_cobro`
--

LOCK TABLES `medios_cobro` WRITE;
/*!40000 ALTER TABLE `medios_cobro` DISABLE KEYS */;
INSERT INTO `medios_cobro` VALUES ('efectivo',1,1),('mercado_pago',0,1),('transferencia',0,1),('transferencia_bancaria',0,1);
/*!40000 ALTER TABLE `medios_cobro` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_caja`
--

DROP TABLE IF EXISTS `movimientos_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `movimientos_caja` (
  `idMovCaja` int(11) NOT NULL AUTO_INCREMENT,
  `idTurno` int(11) NOT NULL,
  `tipoMovimiento` enum('Ingreso','Egreso') NOT NULL,
  `concepto` varchar(150) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `fechaMovimiento` datetime DEFAULT current_timestamp(),
  `idUsu` int(11) NOT NULL,
  `idVenta` int(11) DEFAULT NULL,
  `requestKey` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`idMovCaja`),
  UNIQUE KEY `uk_movimientos_caja_requestKey` (`requestKey`),
  KEY `idTurno` (`idTurno`),
  KEY `idUsu` (`idUsu`),
  KEY `idVenta` (`idVenta`),
  KEY `idx_movimientos_caja_fecha` (`fechaMovimiento`,`idMovCaja`),
  CONSTRAINT `movimientos_caja_ibfk_1` FOREIGN KEY (`idTurno`) REFERENCES `caja_turnos` (`idTurno`),
  CONSTRAINT `movimientos_caja_ibfk_2` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`),
  CONSTRAINT `movimientos_caja_ibfk_3` FOREIGN KEY (`idVenta`) REFERENCES `ventas` (`idVenta`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_caja`
--

LOCK TABLES `movimientos_caja` WRITE;
/*!40000 ALTER TABLE `movimientos_caja` DISABLE KEYS */;
INSERT INTO `movimientos_caja` VALUES (1,1,'Ingreso','Venta #1',105000.00,'2026-10-13 13:24:10',1,1,NULL),(2,4,'Ingreso','Ingreso prueba de caja',100.00,'2026-11-12 00:46:40',1,NULL,NULL),(3,4,'Ingreso','Ingreso prueba de caja',100.00,'2026-11-12 00:46:41',1,NULL,NULL),(4,4,'Ingreso','ingreso prueba',100.00,'2026-11-12 00:48:10',1,NULL,NULL),(5,4,'Ingreso','ingreso prueba',100.00,'2026-11-12 00:48:14',1,NULL,NULL),(6,7,'Ingreso','ingreso  prueba 00',100.00,'2026-11-12 01:42:23',1,NULL,'63612473-64df-4921-9f3d-7c50b3eb57d2'),(7,7,'Egreso','ingreso prueba 00',100.00,'2026-11-12 01:42:41',1,NULL,'6d899104-5093-4557-842f-e150c9a4c4ef');
/*!40000 ALTER TABLE `movimientos_caja` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos_stock`
--

DROP TABLE IF EXISTS `movimientos_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `movimientos_stock` (
  `idMovStock` int(11) NOT NULL AUTO_INCREMENT,
  `idProd` int(11) NOT NULL,
  `tipoMovimiento` enum('Entrada','Salida','Ajuste') NOT NULL,
  `cantidad` decimal(14,3) NOT NULL,
  `fechaMovimiento` datetime DEFAULT current_timestamp(),
  `idUsu` int(11) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idMovStock`),
  KEY `idProd` (`idProd`),
  KEY `idUsu` (`idUsu`),
  CONSTRAINT `movimientos_stock_ibfk_1` FOREIGN KEY (`idProd`) REFERENCES `productos` (`idProd`),
  CONSTRAINT `movimientos_stock_ibfk_2` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos_stock`
--

LOCK TABLES `movimientos_stock` WRITE;
/*!40000 ALTER TABLE `movimientos_stock` DISABLE KEYS */;
INSERT INTO `movimientos_stock` VALUES (1,1,'Entrada',1.000,'2026-10-13 13:23:10',1,''),(2,1,'Salida',2.000,'2026-11-18 04:28:09',1,'Venta #4 - minorista');
/*!40000 ALTER TABLE `movimientos_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `oauth_mp`
--

DROP TABLE IF EXISTS `oauth_mp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `oauth_mp` (
  `resumen` binary(32) NOT NULL,
  `idUsu` int(11) NOT NULL,
  `verificador` char(64) NOT NULL,
  `expira` datetime NOT NULL,
  PRIMARY KEY (`resumen`),
  KEY `idUsu` (`idUsu`),
  KEY `expira` (`expira`),
  CONSTRAINT `oauth_mp_ibfk_1` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `oauth_mp`
--

LOCK TABLES `oauth_mp` WRITE;
/*!40000 ALTER TABLE `oauth_mp` DISABLE KEYS */;
/*!40000 ALTER TABLE `oauth_mp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ordenes_mp`
--

DROP TABLE IF EXISTS `ordenes_mp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ordenes_mp` (
  `idCobro` bigint(20) unsigned NOT NULL,
  `idCaja` int(11) NOT NULL,
  `ordenExterna` varchar(100) DEFAULT NULL,
  `pagoExterno` varchar(100) DEFAULT NULL,
  `estadoProveedor` varchar(64) DEFAULT NULL,
  `detalleEstado` varchar(128) DEFAULT NULL,
  `ultimaVerificacion` datetime DEFAULT NULL,
  PRIMARY KEY (`idCobro`),
  UNIQUE KEY `ordenExterna` (`ordenExterna`),
  UNIQUE KEY `pagoExterno` (`pagoExterno`),
  KEY `idCaja` (`idCaja`),
  CONSTRAINT `ordenes_mp_ibfk_1` FOREIGN KEY (`idCobro`) REFERENCES `cobros_pos` (`idCobro`),
  CONSTRAINT `ordenes_mp_ibfk_2` FOREIGN KEY (`idCaja`) REFERENCES `cajas_mp` (`idCaja`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ordenes_mp`
--

LOCK TABLES `ordenes_mp` WRITE;
/*!40000 ALTER TABLE `ordenes_mp` DISABLE KEYS */;
/*!40000 ALTER TABLE `ordenes_mp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `persona`
--

DROP TABLE IF EXISTS `persona`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `persona` (
  `idPers` int(11) NOT NULL AUTO_INCREMENT,
  `idUsuarioPers` int(11) NOT NULL,
  `direccionFiscalPers` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`idPers`),
  KEY `idUsuarioPers` (`idUsuarioPers`),
  CONSTRAINT `persona_ibfk_1` FOREIGN KEY (`idUsuarioPers`) REFERENCES `usuario` (`idUsu`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `persona`
--

LOCK TABLES `persona` WRITE;
/*!40000 ALTER TABLE `persona` DISABLE KEYS */;
INSERT INTO `persona` VALUES (1,1,NULL),(2,2,NULL),(4,4,NULL),(5,5,NULL),(6,6,NULL);
/*!40000 ALTER TABLE `persona` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `productos` (
  `idProd` int(11) NOT NULL AUTO_INCREMENT,
  `codigoProd` varchar(50) DEFAULT NULL,
  `nombreProd` varchar(150) NOT NULL,
  `descripcionProd` text DEFAULT NULL,
  `precioUnitario` decimal(10,2) NOT NULL,
  `precioMinorista` decimal(10,2) DEFAULT NULL,
  `estadoProd` enum('Activo','Inactivo') DEFAULT 'Activo',
  `idCategoria` int(11) DEFAULT NULL,
  `unidadMedida` varchar(30) NOT NULL DEFAULT 'unidad',
  `codigoBarras` varchar(64) DEFAULT NULL,
  `archivoImagen` varchar(255) DEFAULT NULL,
  `idSubcategoria` int(11) DEFAULT NULL,
  `minimoMayorista` decimal(11,3) DEFAULT NULL CHECK (`minimoMayorista` > 0),
  PRIMARY KEY (`idProd`),
  UNIQUE KEY `codigoProd` (`codigoProd`),
  UNIQUE KEY `uq_producto_barras` (`codigoBarras`),
  KEY `ix_producto_categoria_estado` (`idCategoria`,`estadoProd`),
  KEY `fk_producto_subcategoria` (`idSubcategoria`),
  CONSTRAINT `fk_producto_categoria` FOREIGN KEY (`idCategoria`) REFERENCES `categorias_producto` (`idCategoria`),
  CONSTRAINT `fk_producto_subcategoria` FOREIGN KEY (`idSubcategoria`) REFERENCES `subcategorias_producto` (`idSubcategoria`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (1,'BEB-001','Coca-Cola 2.25L Retornable','Gaseosa Cola 2.25L envase retornable',2100.00,2500.00,'Activo',2,'unidad',NULL,'02fa734eb045dc84539a9f56102f8944d7ea555c.png',1,6.000),(12,'BEB-002','FANTA','PACK DE 10 UNIDADES ',10.00,NULL,'Activo',2,'unidad',NULL,'0038b0c74af7bf750d687e3c4e55839a4a382f71.png',1,NULL);
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reembolsos_mp`
--

DROP TABLE IF EXISTS `reembolsos_mp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reembolsos_mp` (
  `referencia` varchar(100) NOT NULL,
  `idCobro` bigint(20) unsigned NOT NULL,
  `importe` decimal(10,2) NOT NULL CHECK (`importe` > 0),
  `verificado` datetime NOT NULL,
  PRIMARY KEY (`referencia`),
  KEY `idCobro` (`idCobro`),
  CONSTRAINT `reembolsos_mp_ibfk_1` FOREIGN KEY (`idCobro`) REFERENCES `ordenes_mp` (`idCobro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reembolsos_mp`
--

LOCK TABLES `reembolsos_mp` WRITE;
/*!40000 ALTER TABLE `reembolsos_mp` DISABLE KEYS */;
/*!40000 ALTER TABLE `reembolsos_mp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservas_pos`
--

DROP TABLE IF EXISTS `reservas_pos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reservas_pos` (
  `idCobro` bigint(20) unsigned NOT NULL,
  `idProd` int(11) NOT NULL,
  `cantidad` decimal(14,3) NOT NULL CHECK (`cantidad` > 0),
  `precioUnitario` decimal(10,2) NOT NULL,
  `estado` enum('reservada','consumida','liberada') NOT NULL DEFAULT 'reservada',
  PRIMARY KEY (`idCobro`,`idProd`),
  KEY `idProd` (`idProd`,`estado`),
  CONSTRAINT `reservas_pos_ibfk_1` FOREIGN KEY (`idCobro`) REFERENCES `cobros_pos` (`idCobro`),
  CONSTRAINT `reservas_pos_ibfk_2` FOREIGN KEY (`idProd`) REFERENCES `productos` (`idProd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservas_pos`
--

LOCK TABLES `reservas_pos` WRITE;
/*!40000 ALTER TABLE `reservas_pos` DISABLE KEYS */;
/*!40000 ALTER TABLE `reservas_pos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rol_permiso`
--

DROP TABLE IF EXISTS `rol_permiso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rol_permiso` (
  `idRol` int(11) NOT NULL,
  `idDashPer` int(11) NOT NULL,
  `puede_ver` tinyint(1) NOT NULL DEFAULT 1,
  `puede_crear` tinyint(1) NOT NULL DEFAULT 0,
  `puede_modificar` tinyint(1) NOT NULL DEFAULT 0,
  `puede_eliminar` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`idRol`,`idDashPer`),
  KEY `idDashPer` (`idDashPer`),
  CONSTRAINT `rol_permiso_ibfk_1` FOREIGN KEY (`idRol`) REFERENCES `roles` (`idRol`) ON DELETE CASCADE,
  CONSTRAINT `rol_permiso_ibfk_2` FOREIGN KEY (`idDashPer`) REFERENCES `dashboard_permisos` (`idDashPer`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rol_permiso`
--

LOCK TABLES `rol_permiso` WRITE;
/*!40000 ALTER TABLE `rol_permiso` DISABLE KEYS */;
INSERT INTO `rol_permiso` VALUES (1,8,1,0,0,0),(1,9,1,0,0,0),(2,8,1,0,0,0);
/*!40000 ALTER TABLE `rol_permiso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `idRol` int(11) NOT NULL AUTO_INCREMENT,
  `nombreRol` varchar(50) NOT NULL,
  `fechaCreaRol` datetime DEFAULT NULL,
  PRIMARY KEY (`idRol`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Administrador',NULL),(2,'Empleado',NULL),(3,'Cliente',NULL);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sesiones_pos`
--

DROP TABLE IF EXISTS `sesiones_pos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sesiones_pos` (
  `resumenToken` binary(32) NOT NULL,
  `idUsu` int(11) NOT NULL,
  `expira` datetime NOT NULL,
  PRIMARY KEY (`resumenToken`),
  KEY `idUsu` (`idUsu`),
  KEY `expira` (`expira`),
  CONSTRAINT `sesiones_pos_ibfk_1` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sesiones_pos`
--

LOCK TABLES `sesiones_pos` WRITE;
/*!40000 ALTER TABLE `sesiones_pos` DISABLE KEYS */;
INSERT INTO `sesiones_pos` VALUES ('™Â\nßp)!°ZÃ`,.ÜsŸÈ`(Ù/sND¿º“',1,'2026-11-18 15:33:19'),('zRâ·23[∂»§3\0∑4¬ÇÔÀo5ì≤µS…aBÑ¨V',1,'2026-11-18 02:36:01'),('C	Qƒ6®ßd*q(ÕòÊÆ”‹ó≠UiTÑˇM!®Ö',1,'2026-11-18 07:59:06'),('D/KX°	1/‡9¬ëqMn¢∞≈„pﬂ(\\î—o!)s',1,'2026-11-18 03:42:37'),('b=≈D\\ˆ∆üMKD‘öôXW‘∂\'Ü™rﬂƒ ',1,'2026-11-18 06:56:26'),('Ö≈≤¯§‹L#|#UÇuP‹#^a¨è›∑rUr17:Ù\0',1,'2026-11-18 05:54:55'),('êÁ≤n∏YZzüyÏº°áﬁhª·«◊Ù\'}V{túÆ',1,'2026-11-18 21:06:17'),('∞ä¡;(≈≥Ÿ0áˇù!`ÕI—àßãÍeÍQ§¨“ã',1,'2026-11-18 05:20:00'),('€¨H¯X@ﬂÂ√ÉéK;rùxTÏa?˜º&Kæ>é.=4',1,'2026-11-18 02:23:57');
/*!40000 ALTER TABLE `sesiones_pos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subcategorias_producto`
--

DROP TABLE IF EXISTS `subcategorias_producto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subcategorias_producto` (
  `idSubcategoria` int(11) NOT NULL AUTO_INCREMENT,
  `idCategoria` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`idSubcategoria`),
  UNIQUE KEY `idCategoria` (`idCategoria`,`nombre`),
  CONSTRAINT `subcategorias_producto_ibfk_1` FOREIGN KEY (`idCategoria`) REFERENCES `categorias_producto` (`idCategoria`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subcategorias_producto`
--

LOCK TABLES `subcategorias_producto` WRITE;
/*!40000 ALTER TABLE `subcategorias_producto` DISABLE KEYS */;
INSERT INTO `subcategorias_producto` VALUES (1,2,'Gaseosas',1);
/*!40000 ALTER TABLE `subcategorias_producto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuario` (
  `idUsu` int(11) NOT NULL AUTO_INCREMENT,
  `nombreUsu` varchar(100) NOT NULL,
  `apellidoUsu` varchar(100) NOT NULL,
  `correoUsu` varchar(150) NOT NULL,
  `usuarioUsu` varchar(50) NOT NULL,
  `contrasenaUsu` varchar(255) NOT NULL,
  `CUILUsu` varchar(20) DEFAULT NULL,
  `telefonoUsu` varchar(20) DEFAULT NULL,
  `estadoUsu` enum('Activo','Inactivo') DEFAULT 'Activo',
  `rolUsu` enum('Administrador','Empleado','Cliente') NOT NULL DEFAULT 'Cliente',
  `requiereCambioClave` tinyint(1) NOT NULL DEFAULT 0,
  `fechaNacUsu` date DEFAULT NULL,
  `direccionUsu` text DEFAULT NULL,
  PRIMARY KEY (`idUsu`),
  UNIQUE KEY `correoUsu` (`correoUsu`),
  UNIQUE KEY `usuarioUsu` (`usuarioUsu`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES (1,'Aldo','Pujol','aldo@pujolehijos.com','apujol','$argon2id$v=19$m=65536,t=4,p=1$Z1AwVFNOLmVtdDlydDlmWA$XiiAQJaBRjGeaEINyNxG1NNW7vASISqc2H6MHZ1Clz8',NULL,NULL,'Activo','Administrador',0,NULL,NULL),(2,'Juan','Perez','empleado@pujolehijos.com','juanp','$argon2id$v=19$m=65536,t=4,p=1$UlBGa0JITnhUaFcwQTVqVQ$UpmFLXjhlwR67fjYUTfOQ7IXTl80Y7buGp2WNixb7cs',NULL,NULL,'Activo','Empleado',0,NULL,NULL),(4,'Franco','Vega','francoagustin352@gmail.com','francov','$argon2id$v=19$m=65536,t=4,p=1$V3FobmJpOGFYaG8zWnZyUQ$TXxV2WB3/jDM37WOzrHkLQ9I6CdtfJqCmm5fuqpIq30',NULL,NULL,'Activo','Empleado',0,NULL,NULL),(5,'Alejo','Soria','alejosoria518@gmail.com','alejos','$argon2id$v=19$m=65536,t=4,p=1$dDQ2U3phei9pUmt5WkF5Sg$vPI8kb5+bIY9FGpnS25NIMtqpF5DsEGo2wDYkfkgdZo',NULL,NULL,'Activo','Empleado',0,NULL,NULL),(6,'Bruno','Bernal','brunoismaelbernal22@gmail.com','brunob','$argon2id$v=19$m=65536,t=4,p=1$WUl0TkdtSXoxc2I3ajk1ag$LI1Q3cFRXoWjNjthTtMhK/xxWpOM5x41abf6UivRtzg',NULL,NULL,'Activo','Empleado',0,NULL,NULL);
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_AUTO_VALUE_ON_ZERO' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `sync_usuario_to_persona` AFTER INSERT ON `usuario` FOR EACH ROW BEGIN
    INSERT INTO persona (idUsuarioPers) VALUES (NEW.idUsu);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `usuario_permiso_accion`
--

DROP TABLE IF EXISTS `usuario_permiso_accion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuario_permiso_accion` (
  `idUsu` int(11) NOT NULL,
  `idDashPer` int(11) NOT NULL,
  `accion` enum('visualizar','crear','modificar','anular') NOT NULL,
  `permitido` tinyint(1) NOT NULL CHECK (`permitido` in (0,1)),
  PRIMARY KEY (`idUsu`,`idDashPer`,`accion`),
  KEY `idDashPer` (`idDashPer`),
  CONSTRAINT `usuario_permiso_accion_ibfk_1` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`),
  CONSTRAINT `usuario_permiso_accion_ibfk_2` FOREIGN KEY (`idDashPer`) REFERENCES `dashboard_permisos` (`idDashPer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario_permiso_accion`
--

LOCK TABLES `usuario_permiso_accion` WRITE;
/*!40000 ALTER TABLE `usuario_permiso_accion` DISABLE KEYS */;
/*!40000 ALTER TABLE `usuario_permiso_accion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario_rol`
--

DROP TABLE IF EXISTS `usuario_rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuario_rol` (
  `idUsu` int(11) NOT NULL,
  `idRol` int(11) NOT NULL,
  PRIMARY KEY (`idUsu`,`idRol`),
  KEY `idRol` (`idRol`),
  CONSTRAINT `usuario_rol_ibfk_1` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`) ON DELETE CASCADE,
  CONSTRAINT `usuario_rol_ibfk_2` FOREIGN KEY (`idRol`) REFERENCES `roles` (`idRol`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario_rol`
--

LOCK TABLES `usuario_rol` WRITE;
/*!40000 ALTER TABLE `usuario_rol` DISABLE KEYS */;
INSERT INTO `usuario_rol` VALUES (1,1),(2,2),(4,2),(5,2),(6,2);
/*!40000 ALTER TABLE `usuario_rol` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ventas`
--

DROP TABLE IF EXISTS `ventas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ventas` (
  `idVenta` int(11) NOT NULL AUTO_INCREMENT,
  `fechaVenta` datetime DEFAULT current_timestamp(),
  `totalVenta` decimal(10,2) NOT NULL,
  `idUsu` int(11) NOT NULL,
  `estadoVenta` enum('Completada','Anulada') DEFAULT 'Completada',
  `tipoVenta` enum('mayorista','minorista') DEFAULT NULL,
  `esPrueba` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`idVenta`),
  KEY `idUsu` (`idUsu`),
  KEY `idx_ventas_estado_prueba_fecha` (`estadoVenta`,`esPrueba`,`fechaVenta`,`idVenta`),
  CONSTRAINT `ventas_ibfk_1` FOREIGN KEY (`idUsu`) REFERENCES `usuario` (`idUsu`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ventas`
--

LOCK TABLES `ventas` WRITE;
/*!40000 ALTER TABLE `ventas` DISABLE KEYS */;
INSERT INTO `ventas` VALUES (1,'2026-10-13 13:24:10',105000.00,1,'Completada',NULL,0),(2,'2026-11-12 00:25:29',450.00,1,'Completada',NULL,0),(3,'2026-11-12 00:25:51',500.00,1,'Completada',NULL,0),(4,'2026-11-18 04:28:09',5000.00,1,'Completada','minorista',1);
/*!40000 ALTER TABLE `ventas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'pujol_e_hijos'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-23  9:49:51
