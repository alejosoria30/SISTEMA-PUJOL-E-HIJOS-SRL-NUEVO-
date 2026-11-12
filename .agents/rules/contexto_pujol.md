---
name: Contexto del Proyecto Pujol e Hijos
description: Reglas e información del negocio para mantener coherencia en el código, UI y base de datos.
---

# Contexto del Proyecto: SISTEMA PUJOL E HIJOS SRL

**¡ATENCIÓN AGENTE!** Lee esto antes de hacer cualquier cambio en el proyecto.

## 1. Información del Negocio
- **Nombre:** Pujol e Hijos S.R.L.
- **Rubro:** Distribuidora Mayorista de Bebidas (No Alcohólicas).
- **Ubicación:** Formosa.
- **Importante:** Bajo NINGUNA circunstancia asumas que es una ferretería u otro rubro. Los datos de prueba, categorías y lógica deben ser sobre bebidas (Coca-Cola, Sprite, Aguas, Packs, etc.).

## 2. Tecnologías y Estructura
- **Frontend:** Angular 16+ con **Metronic 8.2**.
- **Backend/API:** PHP puro (`api/index.php`).
- **Base de Datos:** MySQL (Script en `bdPujolScript.sql`).
- **Repositorio Git:** El proyecto está vinculado a GitHub (`origin/main`). **Regla:** Después de cambios visuales o lógicos que el usuario apruebe, siempre sugerir y ejecutar el comando `git push` para respaldar los avances.

## 3. Identidad Visual y Diseño (UI/UX)
- **Modo Claro / Modo Oscuro:** Soportado globalmente (`[data-bs-theme="dark"]`).
- **Paleta de Colores:** 
  - Primario: Cian (`#00A3FF`).
  - Fondo Modo Oscuro: Azul Medianoche (`#0b132b`).
- **Estilo Premium (Glassmorphism):** Las tarjetas (`.card`) y cabeceras en modo oscuro utilizan `backdrop-filter: blur(12px)` y fondos semitransparentes para un efecto vidrio/premium.
- **Animaciones:** 
  - La navegación entre módulos cuenta con una animación global (`router-outlet + *`) de desvanecimiento y deslizamiento hacia arriba (`module-fade-slide-in`).
  - Pantalla de carga (Splash Screen): Logo circular en el centro con un spinner perimetral rotando por fuera.
- **Navegación:** En todos los módulos (excepto el Dashboard principal) existe un botón global de "Volver Atrás" que redirige estrictamente hacia `/dashboard`.

## 4. Usuarios y Autenticación
- **Regla de contraseñas:** Los nuevos usuarios registrados a través del sistema deben tener la contraseña *hasheada*. Sin embargo, los usuarios de prueba creados manualmente en el archivo `.sql` (como el Administrador "Aldo Pujol") se insertan en texto plano según lo configurado en la lógica actual de autenticación para facilitar pruebas.

## 5. Historial de Módulos Trabajados
- **Gestión de Stock:** Refactorizado para bebidas (Entradas, Salidas, Ajustes de Inventario, Lotes).
- **Dashboard:** Traducido a métricas de distribución ("Catálogo de Bebidas", "Bajo Mínimo").
- **Barra Lateral:** Logos e iconos tematizados a distribución (camiones, pallets, calendario, cajas).
