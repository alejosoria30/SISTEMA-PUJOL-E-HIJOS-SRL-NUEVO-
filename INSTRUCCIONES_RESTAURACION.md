# Guía de Restauración de Copia de Seguridad - Pujol e Hijos S.R.L.
**Fecha del respaldo:** 23 de Noviembre de 2026  
**Identificador de versión:** `v1.0.0-estable-20261123` / Rama `backup/version-estable-20261123`

---

## Contenido del Respaldo
1. **Base de Datos MariaDB:** `backups/db_pujol_e_hijos_backup_20261123.sql` (30 tablas completas con datos de productos, ventas, turnos, usuarios y roles).
2. **Código Fuente Completo:** Frontend Angular 16 (`admin_metronic_8.2`), Backend PHP (`api/`), scripts y herramientas.
3. **Documentación Oficial:**
   - `Manual_de_Usuario_Pujol_e_Hijos.docx`
   - `Documentacion_Pantallas_Pujol_e_Hijos.docx`
4. **Archivo Comprimido Offline:** `backups/Backup_Pujol_e_Hijos_SRL_20261123.zip` (y copia en la carpeta `Descargas`).

---

## Opción 1: Restauración Rápida con Git (Recomendada para el Código)

Si durante una actualización se rompe algún componente visual, de rutas o del backend, puedes volver inmediatamente a este punto exacto con un solo comando en la terminal:

```bash
# Descartar cambios no guardados y volver a la versión estable respaldada:
git checkout backup/version-estable-20261123
```

O si deseas volver a posicionarte en la etiqueta de versión:
```bash
git checkout tags/v1.0.0-estable-20261123
```

---

## Opción 2: Restauración de la Base de Datos

Si se pierden datos, productos o configuraciones en la base de datos, puedes restablecerla de dos maneras:

### Método A: Desde Línea de Comandos (MySQL CLI)
Ejecutar en PowerShell o CMD:
```bash
# Restaurar la base de datos en el puerto correspondiente (por ejemplo, 3305 o 3306):
C:\xampp\mysql\bin\mysql.exe --port=3305 -u root pujol_e_hijos < "c:\xampp\htdocs\Pujol_e_Hijos_SRL\backups\db_pujol_e_hijos_backup_20261123.sql"
```

### Método B: Desde phpMyAdmin
1. Ingresar a `http://localhost/phpmyadmin` (o al puerto configurado).
2. Seleccionar la base de datos `pujol_e_hijos` en el menú izquierdo.
3. Ir a la pestaña **Importar**.
4. En "Seleccionar archivo", elegir `backups/db_pujol_e_hijos_backup_20261123.sql` (o desde la carpeta `Descargas`).
5. Hacer clic en **Importar** al final de la página.

---

## Opción 3: Restauración Total desde el Archivo ZIP

Si necesitas reinstalar el proyecto en otra máquina o carpeta:
1. Descomprimir `Backup_Pujol_e_Hijos_SRL_20261123.zip` en `C:\xampp\htdocs\Pujol_e_Hijos_SRL`.
2. Importar el archivo SQL incluido en la base de datos `pujol_e_hijos`.
3. En la carpeta `admin_metronic_8.2`, ejecutar `npm install` si fuera necesario regenerar dependencias.
4. Levantar el servidor con `ng serve` o usar la versión compilada en `dist/demo1`.
