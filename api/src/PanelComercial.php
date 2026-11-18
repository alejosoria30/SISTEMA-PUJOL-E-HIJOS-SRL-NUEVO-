<?php
declare(strict_types=1);

final class PanelComercial
{
    private Acceso $sql;
    public function __construct(Acceso $sql) { $this->sql = $sql; }

    public function consultar(array $filtros, bool $verCaja): array
    {
        $zona = $this->sql->consultar('SELECT zonaHoraria FROM configuracion_comercio WHERE id=1')->fetchColumn();
        $hoy = new DateTimeImmutable('today', new DateTimeZone($zona));
        $hasta = $hoy;
        switch ($filtros['periodo'] ?? 'hoy') {
            case 'hoy': $desde = $hoy; break;
            case 'semana': $desde = $hoy->modify('-6 days'); break;
            case 'treinta': $desde = $hoy->modify('-29 days'); break;
            case 'mes': $desde = $hoy->modify('first day of this month'); break;
            case 'personalizado':
                $desde = $this->fecha($filtros['desde'] ?? '', $hoy);
                $hasta = $this->fecha($filtros['hasta'] ?? '', $hoy);
                if ($desde > $hasta) throw new DomainException('La fecha final debe ser igual o posterior a la inicial.');
                break;
            default: throw new DomainException('Período inválido.');
        }
        $limites = [$desde->format('Y-m-d'),$hasta->modify('+1 day')->format('Y-m-d')];
        $ventas = " FROM ventas v WHERE v.estadoVenta='Completada' AND v.esPrueba=0 AND v.fechaVenta>=? AND v.fechaVenta<? ";
        $detalles = " FROM detalle_venta d JOIN productos p USING(idProd) JOIN ventas v USING(idVenta)
            LEFT JOIN categorias_producto c ON c.idCategoria=p.idCategoria WHERE v.estadoVenta='Completada' AND v.esPrueba=0 AND v.fechaVenta>=? AND v.fechaVenta<? ";
        $agrupacion = ['dia'=>'DATE(v.fechaVenta)','semana'=>'DATE_SUB(DATE(v.fechaVenta),INTERVAL WEEKDAY(v.fechaVenta) DAY)',
            'mes'=>"DATE_FORMAT(v.fechaVenta,'%Y-%m-01')"][$filtros['agrupar'] ?? 'dia'] ?? null;
        if (!$agrupacion) throw new DomainException('Agrupación inválida.');
        $series = [
            'Facturación en el tiempo'=>"SELECT $agrupacion etiqueta,SUM(v.totalVenta) valor $ventas GROUP BY etiqueta ORDER BY etiqueta",
            'Facturación por modalidad'=>"SELECT COALESCE(v.tipoVenta,'Sin clasificar') etiqueta,SUM(v.totalVenta) valor $ventas GROUP BY etiqueta ORDER BY valor DESC",
            'Cobros por medio'=>"SELECT c.medio etiqueta,SUM(c.importe-COALESCE(r.importe,0)) valor FROM cobros_pos c JOIN ventas v USING(idVenta)
                LEFT JOIN (SELECT idCobro,SUM(importe) importe FROM reembolsos_mp GROUP BY idCobro) r USING(idCobro)
                WHERE c.estado='aprobado' AND v.esPrueba=0 AND COALESCE(c.fechaAcreditacion,v.fechaVenta)>=? AND COALESCE(c.fechaAcreditacion,v.fechaVenta)<? GROUP BY etiqueta ORDER BY valor DESC",
            'Productos más vendidos'=>"SELECT p.nombreProd etiqueta,SUM(d.cantidad) valor $detalles GROUP BY p.idProd,p.nombreProd ORDER BY valor DESC,p.idProd LIMIT 8",
            'Facturación por categoría'=>"SELECT COALESCE(c.nombre,'Sin categoría') etiqueta,SUM(d.subtotal) valor $detalles GROUP BY etiqueta ORDER BY valor DESC LIMIT 8"
        ];
        $graficos=[];
        foreach ($series as $titulo=>$consulta) {
            $filas=$this->sql->consultar($consulta,$limites)->fetchAll();
            $graficos[]=['titulo'=>$titulo,'monetario'=>$titulo!=='Productos más vendidos','filas'=>$filas,
                'maximo'=>$filas ? max(1,max(array_column($filas,'valor'))) : 1];
        }
        return [
            'desde'=>$limites[0],'hasta'=>$hasta->format('Y-m-d'),'zona'=>$zona,
            'ventas'=>$this->sql->consultar("SELECT COUNT(*) cantidad,COALESCE(SUM(totalVenta),0) importe,COALESCE(AVG(totalVenta),0) promedio,
                COUNT(CASE WHEN tipoVenta='mayorista' THEN 1 END) mayoristas, COUNT(CASE WHEN tipoVenta='minorista' THEN 1 END) minoristas $ventas",$limites)->fetch(),
            'stock'=>$this->sql->consultar("SELECT COUNT(*) activos,COUNT(CASE WHEN IFNULL(i.stockActual,0)<=0 THEN 1 END) agotados,
                COUNT(CASE WHEN i.stockActual>0 AND i.stockActual<=i.stockMinimo THEN 1 END) bajos FROM productos p LEFT JOIN inventario i USING(idProd) WHERE p.estadoProd='Activo'")->fetch(),
            'alertas'=>$this->sql->consultar("SELECT p.nombreProd, i.stockActual FROM inventario i JOIN productos p USING(idProd) WHERE p.estadoProd='Activo' AND i.stockActual<=i.stockMinimo ORDER BY i.stockActual,p.nombreProd LIMIT 8")->fetchAll(),
            'ultimas'=>$this->sql->consultar("SELECT idVenta,totalVenta,fechaVenta $ventas ORDER BY fechaVenta DESC,idVenta DESC LIMIT 6",$limites)->fetchAll(),
            'turno'=>$verCaja ? $this->sql->consultar("SELECT idTurno FROM caja_turnos WHERE estadoTurno='Abierto' ORDER BY idTurno DESC LIMIT 1")->fetchColumn() : null,
            'movimientos'=>$verCaja ? $this->sql->consultar('SELECT concepto,tipoMovimiento,monto FROM movimientos_caja WHERE fechaMovimiento>=? AND fechaMovimiento<? ORDER BY fechaMovimiento DESC,idMovCaja DESC LIMIT 5',$limites)->fetchAll() : [],
            'graficos'=>$graficos
        ];
    }

    private function fecha(string $valor, DateTimeImmutable $hoy): DateTimeImmutable
    {
        $fecha=DateTimeImmutable::createFromFormat('!Y-m-d',$valor,$hoy->getTimezone());
        if (!$fecha || $fecha->format('Y-m-d')!==$valor) throw new DomainException('Complete las dos fechas del período.');
        return $fecha;
    }
}
