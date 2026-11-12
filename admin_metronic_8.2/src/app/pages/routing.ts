import { Routes } from '@angular/router';

const Routing: Routes = [
  {
    path: 'dashboard',
    title: 'Dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'builder',
    title: 'Maquetador de Vistas',
    loadChildren: () => import('./builder/builder.module').then((m) => m.BuilderModule),
  },
  {
    path: 'crafted/pages/profile',
    title: 'Perfil de Usuario',
    loadChildren: () => import('../modules/profile/profile.module').then((m) => m.ProfileModule),
    // data: { layout: 'light-sidebar' },
  },
  {
    path: 'crafted/account',
    title: 'Mi Cuenta',
    loadChildren: () => import('../modules/account/account.module').then((m) => m.AccountModule),
    // data: { layout: 'dark-header' },
  },
  {
    path: 'crafted/pages/wizards',
    title: 'Asistentes',
    loadChildren: () => import('../modules/wizards/wizards.module').then((m) => m.WizardsModule),
    // data: { layout: 'light-header' },
  },
  {
    path: 'crafted/widgets',
    title: 'Widgets y Componentes',
    loadChildren: () => import('../modules/widgets-examples/widgets-examples.module').then((m) => m.WidgetsExamplesModule),
    // data: { layout: 'light-header' },
  },
  {
    path: 'apps/chat',
    title: 'Mensajería',
    loadChildren: () => import('../modules/apps/chat/chat.module').then((m) => m.ChatModule),
    // data: { layout: 'light-sidebar' },
  },
  {
    path: 'apps/users',
    title: 'Gestión de Usuarios',
    loadChildren: () => import('./user/user.module').then((m) => m.UserModule),
  },
  {
    path: 'apps/roles',
    title: 'Roles y Permisos',
    loadChildren: () => import('./role/role.module').then((m) => m.RoleModule),
  },
  {
    path: 'apps/permissions',
    title: 'Permisos del Sistema',
    loadChildren: () => import('./permission/permission.module').then((m) => m.PermissionModule),
  },
  {
    path: 'catalogo',
    title: 'Catálogo de Bebidas',
    loadChildren: () => import('./catalogo/catalogo.module').then((m) => m.CatalogoModule),
  },
  {
    path: 'stock',
    title: 'Control de Stock',
    loadChildren: () => import('./stock/stock.module').then((m) => m.StockModule),
  },
  {
    path: 'caja',
    title: 'Caja y Rendiciones',
    loadChildren: () => import('./caja/caja.module').then((m) => m.CajaModule),
  },
  {
    path: 'comprobantes',
    title: 'Comprobantes Fiscales',
    loadChildren: () => import('./comprobantes/comprobantes.module').then((m) => m.ComprobantesModule),
  },
  {
    path: 'clientes',
    title: 'Clientes',
    loadChildren: () => import('./clientes/clientes.module').then((m) => m.ClientesModule),
  },
  {
    path: 'pedidos',
    title: 'Pedidos',
    loadChildren: () => import('./pedidos/pedidos.module').then((m) => m.PedidosModule),
  },
  {
    path: 'ventas',
    title: 'Ventas POS',
    loadChildren: () => import('./ventas/ventas.module').then((m) => m.VentasModule),
  },
  {
    path: 'historial-ventas',
    title: 'Historial de Ventas',
    loadChildren: () => import('./historial-ventas/historial-ventas.module').then((m) => m.HistorialVentasModule),
  },
  {
    path: 'empleados',
    title: 'Empleados',
    loadChildren: () => import('./empleados/empleados.module').then((m) => m.EmpleadosModule),
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'error/404',
  },
];

export { Routing };
