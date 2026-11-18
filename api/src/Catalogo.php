<?php
declare(strict_types=1);

/** Catálogo de productos del comercio: precioUnitario = precio mayorista histórico. */
final class Catalogo
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function listar(): array
    {
        $sql = <<<'SQL'
            SELECT p.idProd AS id,
                   p.codigoProd AS code,
                   p.nombreProd AS name,
                   p.descripcionProd AS description,
                   p.precioUnitario AS price,
                   p.precioUnitario AS precioMayorista,
                   p.precioMinorista AS precioMinorista,
                   p.minimoMayorista, p.idSubcategoria AS subcategoriaId, s.nombre AS subcategoria,
                   p.estadoProd AS status,
                   p.unidadMedida AS unidad,
                   p.codigoBarras AS barras,
                   p.idCategoria AS categoriaId,
                   c.nombre AS categoria,
                   p.archivoImagen AS imagen,
                   i.stockActual AS quantity,
                   i.stockMinimo AS minThreshold
            FROM productos p
            LEFT JOIN categorias_producto c ON c.idCategoria = p.idCategoria
            LEFT JOIN subcategorias_producto s ON s.idSubcategoria=p.idSubcategoria
            LEFT JOIN inventario i ON i.idProd = p.idProd
            ORDER BY p.nombreProd
            SQL;

        $filas = $this->db->query($sql)->fetchAll();
        foreach ($filas as &$producto) {
            foreach (['price', 'precioMayorista', 'quantity', 'minThreshold'] as $campo) {
                $producto[$campo] = $producto[$campo] === null ? 0.0 : (float)$producto[$campo];
            }
            $producto['precioMinorista'] = $producto['precioMinorista'] === null
                ? null
                : (float)$producto['precioMinorista'];
            foreach (['minimoMayorista', 'subcategoriaId'] as $campo) {
                if ($producto[$campo] !== null) $producto[$campo] = $campo === 'subcategoriaId'
                    ? (int)$producto[$campo] : (float)$producto[$campo];
            }
            $producto['id'] = (int)$producto['id'];
            if ($producto['categoriaId'] !== null) {
                $producto['categoriaId'] = (int)$producto['categoriaId'];
            }
        }
        unset($producto);

        return $filas;
    }

    /**
     * Valida importes de DECIMAL(10,2). La conversión se realiza en el servidor,
     * nunca se utiliza un valor de precio enviado por el carrito al registrar ventas.
     */
    private function precio($valor, string $campo, bool $admiteNulo = false): ?string
    {
        if ($admiteNulo && ($valor === null || $valor === '')) {
            return null;
        }
        if (!is_string($valor) && !is_int($valor) && !is_float($valor)) {
            throw new DomainException('Ingrese un ' . $campo . ' válido.');
        }
        $importe = (string)$valor;
        if (!preg_match('/^\d{1,8}(?:\.\d{1,2})?$/D', $importe)) {
            throw new DomainException('El ' . $campo . ' está fuera de rango.');
        }
        return $importe;
    }

    private function cantidad($valor, string $campo): string
    {
        if (!is_string($valor) && !is_int($valor) && !is_float($valor)) {
            throw new DomainException('Ingrese ' . $campo . ' válido.');
        }
        $cantidad = (string)$valor;
        if (!preg_match('/^\d{1,11}(?:\.\d{1,3})?$/D', $cantidad)) {
            throw new DomainException('La cantidad de ' . $campo . ' está fuera de rango.');
        }
        return $cantidad;
    }

    private function foto(array $foto): string
    {
        $datos = base64_decode((string)($foto['datos'] ?? ''), true);
        if ($datos === false || $datos === '' || strlen($datos) > 3 * 1024 * 1024) {
            throw new DomainException('La imagen supera 3 MB o está dañada.');
        }
        if (!extension_loaded('gd') || !function_exists('imagecreatefromstring')) {
            throw new RuntimeException('Falta habilitar la extensión GD de PHP para procesar imágenes.');
        }
        $info = @getimagesizefromstring($datos);
        $tipos = ['image/jpeg' => ['jpg', 'jpeg'], 'image/png' => ['png'], 'image/webp' => ['webp']];
        $extension = strtolower(pathinfo((string)($foto['nombre'] ?? ''), PATHINFO_EXTENSION));
        $extensionesPermitidas = $tipos[$info['mime'] ?? ''] ?? [];
        if (!$info || (int)$info[0] <= 0 || (int)$info[1] <= 0
            || (int)$info[0] * (int)$info[1] > 16000000
            || !in_array($extension, $extensionesPermitidas, true)) {
            throw new DomainException('Verifique formato, extensión y dimensiones de la imagen.');
        }

        $directorio = dirname(__DIR__) . '/fotos';
        if (!is_dir($directorio) && !@mkdir($directorio, 0770, true) && !is_dir($directorio)) {
            throw new RuntimeException('No se pudo preparar la carpeta de fotografías.');
        }
        if (!is_writable($directorio)) {
            throw new RuntimeException('La carpeta de fotografías no admite escritura.');
        }

        $imagen = @imagecreatefromstring($datos);
        if (!$imagen) {
            throw new DomainException('La imagen no se pudo abrir.');
        }
        imagealphablending($imagen, false);
        imagesavealpha($imagen, true);
        $nombre = bin2hex(random_bytes(20)) . '.png';
        $ruta = $directorio . '/' . $nombre;
        try {
            if (!@imagepng($imagen, $ruta)) {
                throw new RuntimeException('No se pudo guardar la imagen en el servidor.');
            }
        } finally {
            imagedestroy($imagen);
        }
        return $nombre;
    }

    /**
     * $usuarioActual permite auditar modificaciones de stock desde el catálogo.
     * Se mantiene opcional para no romper invocaciones antiguas sin movimientos.
     */
    public function guardar(array $producto, ?int $usuarioActual = null): int
    {
        $id = (int)($producto['id'] ?? 0);
        if ($id < 0) {
            throw new DomainException('Identificador de producto inválido.');
        }
        $nombre = trim((string)($producto['name'] ?? ''));
        $unidad = trim((string)($producto['unidad'] ?? 'unidad'));
        if ($nombre === '' || $unidad === '' || mb_strlen($nombre) > 150 || strlen($unidad) > 30) {
            throw new DomainException('Complete correctamente nombre y unidad.');
        }

        // El precio mayorista se resuelve tras leer el valor previo para soportar
        // formularios Angular antiguos que solo editan el campo `price`.
        $stock = $this->cantidad($producto['quantity'] ?? null, 'stock actual');
        $minimo = $this->cantidad($producto['minThreshold'] ?? null, 'stock mínimo');
        $estado = $producto['status'] ?? 'Activo';
        if (!in_array($estado, ['Activo', 'Inactivo'], true)) {
            throw new DomainException('Estado inválido.');
        }

        $archivoNuevo = null;
        $foto = null;
        $anterior = null;
        $this->db->beginTransaction();
        try {
            if ($id > 0) {
                $consulta = $this->db->prepare(
                    'SELECT p.archivoImagen, p.minimoMayorista, p.idSubcategoria, p.idCategoria, p.precioUnitario, p.precioMinorista, i.stockActual '
                    . 'FROM productos p LEFT JOIN inventario i ON i.idProd=p.idProd '
                    . 'WHERE p.idProd=? FOR UPDATE'
                );
                $consulta->execute([$id]);
                $anterior = $consulta->fetch();
                if (!$anterior) {
                    throw new DomainException('Producto inexistente.');
                }
                if (!array_key_exists('stockEsperado', $producto)
                    || $producto['stockEsperado'] === null
                    || round((float)$producto['stockEsperado'], 3) !== round((float)$anterior['stockActual'], 3)) {
                    throw new DomainException('El stock cambió. Actualice el catálogo y vuelva a editar.');
                }
                $foto = $anterior['archivoImagen'];
            }

            // Ante campos duplicados, preferir el que realmente cambió respecto
            // del valor guardado. Así el editor de precio rápido sigue funcionando.
            $precioLegacy = array_key_exists('price', $producto)
                ? $this->precio($producto['price'], 'precio mayorista') : null;
            $precioNuevo = array_key_exists('precioMayorista', $producto)
                ? $this->precio($producto['precioMayorista'], 'precio mayorista') : null;
            if ($precioLegacy !== null && $precioNuevo !== null
                && (float)$precioLegacy !== (float)$precioNuevo) {
                $previo = $anterior === null ? null : (float)$anterior['precioUnitario'];
                if ($previo !== null && (float)$precioNuevo === $previo) {
                    $mayorista = $precioLegacy;
                } elseif ($previo !== null && (float)$precioLegacy === $previo) {
                    $mayorista = $precioNuevo;
                } else {
                    throw new DomainException('Los valores del precio mayorista no coinciden. Actualice el catálogo.');
                }
            } else {
                $mayorista = $precioNuevo ?? $precioLegacy;
            }
            if ($mayorista === null) {
                throw new DomainException('Debe indicar el precio mayorista.');
            }

            // El frontend anterior no envía precioMinorista: conservar el valor actual.
            $precioMinorista = $anterior['precioMinorista'] ?? null;
            if (array_key_exists('precioMinorista', $producto)) {
                $precioMinorista = $this->precio($producto['precioMinorista'], 'precio minorista', true);
            }

            $categoria = $producto['categoriaId'] ?? null;
            if ($categoria === '') {
                $categoria = null;
            }
            if ($categoria !== null) {
                $categoria = filter_var($categoria, FILTER_VALIDATE_INT);
                if ($categoria === false || $categoria <= 0) {
                    throw new DomainException('La categoría no es válida.');
                }
                if ($anterior === null || (int)$categoria !== (int)$anterior['idCategoria']) {
                    $consulta = $this->db->prepare(
                        'SELECT idCategoria FROM categorias_producto WHERE idCategoria=? AND activa=1'
                    );
                    $consulta->execute([$categoria]);
                    if (!$consulta->fetchColumn()) {
                        throw new DomainException('Seleccione una categoría activa.');
                    }
                }
            }

            $umbral = array_key_exists('minimoMayorista', $producto)
                ? $producto['minimoMayorista'] : ($anterior['minimoMayorista'] ?? null);
            if ($umbral !== null && $umbral !== '') {
                $umbral = $this->cantidad($umbral, 'mínimo mayorista');
                if ((float)$umbral <= 0 || (float)$umbral > 99999999.999 ||
                    (in_array(strtolower(trim($unidad)), ['unidad','caja','paquete'], true) && floor((float)$umbral) != (float)$umbral))
                    throw new DomainException('Revise el mínimo mayorista y la unidad de medida.');
            } else {
                $umbral = null;
            }
            $subcategoria = array_key_exists('subcategoriaId', $producto) ? $producto['subcategoriaId']
                : (($anterior['idCategoria'] ?? null) == $categoria ? ($anterior['idSubcategoria'] ?? null) : null);
            if ($subcategoria !== null) {
                $consulta = $this->db->prepare('SELECT activa FROM subcategorias_producto WHERE idCategoria=? AND idSubcategoria=?');
                $consulta->execute([$categoria,$subcategoria]);
                $activa = $consulta->fetchColumn();
                if ($activa === false || (!$activa && $subcategoria != ($anterior['idSubcategoria'] ?? null)))
                    throw new DomainException('Seleccione una subcategoría activa de la categoría elegida.');
            }

            if (isset($producto['fotoNueva'])) {
                if (!is_array($producto['fotoNueva'])) {
                    throw new DomainException('Archivo de imagen inválido.');
                }
                $foto = $archivoNuevo = $this->foto($producto['fotoNueva']);
            } elseif (!empty($producto['quitarFoto'])) {
                $foto = null;
            }

            $codigo = trim((string)($producto['code'] ?? ''));
            $codigo = $codigo !== '' ? $codigo : null;
            $barras = trim((string)($producto['barras'] ?? ''));
            $barras = $barras !== '' ? $barras : null;
            $campos = 'minimoMayorista=?,idSubcategoria=?,nombreProd=?,codigoProd=?,descripcionProd=?,precioUnitario=?,precioMinorista=?,unidadMedida=?,codigoBarras=?,idCategoria=?,archivoImagen=?,estadoProd=?';
            $parametros = [$umbral, $subcategoria, $nombre, $codigo, (string)($producto['description'] ?? ''),
                $mayorista, $precioMinorista, $unidad, $barras, $categoria, $foto, $estado];
            if ($id > 0) {
                $parametros[] = $id;
            }
            $this->db->prepare($id > 0
                ? "UPDATE productos SET $campos WHERE idProd=?"
                : "INSERT INTO productos SET $campos")->execute($parametros);

            if ($id === 0) {
                $id = (int)$this->db->lastInsertId();
            }
            if ($codigo === null) {
                $this->db->prepare("UPDATE productos SET codigoProd=CONCAT('PROD-',idProd) WHERE idProd=?")
                    ->execute([$id]);
            }

            $this->db->prepare(
                'INSERT INTO inventario(idProd,stockActual,stockMinimo) VALUES(?,?,?) '
                . 'ON DUPLICATE KEY UPDATE stockActual=VALUES(stockActual),stockMinimo=VALUES(stockMinimo)'
            )->execute([$id, $stock, $minimo]);

            // Registrar en movimientos_stock cuando cambia el inventario desde el catálogo.
            $stockAnterior = $anterior === null ? 0.0 : (float)($anterior['stockActual'] ?? 0);
            if (round((float)$stock, 3) !== round($stockAnterior, 3)) {
                if (!$usuarioActual || $usuarioActual < 1) {
                    throw new DomainException('Se necesita el usuario responsable para ajustar el stock.');
                }
                $tipoMovimiento = $anterior === null ? 'Entrada' : 'Ajuste';
                $observaciones = $anterior === null
                    ? 'Stock inicial del producto'
                    : sprintf('Ajuste desde catálogo: %.3f a %.3f', $stockAnterior, (float)$stock);
                $this->db->prepare(
                    'INSERT INTO movimientos_stock(idProd,tipoMovimiento,cantidad,idUsu,observaciones) VALUES(?,?,?,?,?)'
                )->execute([$id, $tipoMovimiento, $stock, $usuarioActual, $observaciones]);
            }

            $this->db->commit();
        } catch (Throwable $error) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($archivoNuevo !== null) {
                @unlink(dirname(__DIR__) . '/fotos/' . $archivoNuevo);
            }
            throw $error;
        }

        if ($anterior && !empty($anterior['archivoImagen']) && $anterior['archivoImagen'] !== $foto
            && preg_match('/^[a-f0-9]{40}\.png$/D', $anterior['archivoImagen'])) {
            @unlink(dirname(__DIR__) . '/fotos/' . $anterior['archivoImagen']);
        }
        return $id;
    }
}
