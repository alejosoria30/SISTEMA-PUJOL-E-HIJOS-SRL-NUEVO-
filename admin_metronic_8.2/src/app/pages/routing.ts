import { Routes } from '@angular/router';

const Routing: Routes = [
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
  },
  {
    path: 'builder',
    loadChildren: () => import('./builder/builder.module').then((m) => m.BuilderModule),
  },
  {
    path: 'crafted/pages/profile',
    loadChildren: () => import('../modules/profile/profile.module').then((m) => m.ProfileModule),
    // data: { layout: 'light-sidebar' },
  },
  {
    path: 'crafted/account',
    loadChildren: () => import('../modules/account/account.module').then((m) => m.AccountModule),
    // data: { layout: 'dark-header' },
  },
  {
    path: 'crafted/pages/wizards',
    loadChildren: () => import('../modules/wizards/wizards.module').then((m) => m.WizardsModule),
    // data: { layout: 'light-header' },
  },
  {
    path: 'crafted/widgets',
    loadChildren: () => import('../modules/widgets-examples/widgets-examples.module').then((m) => m.WidgetsExamplesModule),
    // data: { layout: 'light-header' },
  },
  {
    path: 'apps/chat',
    loadChildren: () => import('../modules/apps/chat/chat.module').then((m) => m.ChatModule),
    // data: { layout: 'light-sidebar' },
  },
  {
    path: 'apps/users',
    loadChildren: () => import('./user/user.module').then((m) => m.UserModule),
  },
  {
    path: 'apps/roles',
    loadChildren: () => import('./role/role.module').then((m) => m.RoleModule),
  },
  {
    path: 'apps/permissions',
    loadChildren: () => import('./permission/permission.module').then((m) => m.PermissionModule),
  },
  {
    path: 'stock',
    loadChildren: () => import('./stock/stock.module').then((m) => m.StockModule),
  },
  {
    path: 'caja',
    loadChildren: () => import('./caja/caja.module').then((m) => m.CajaModule),
  },
  {
    path: 'comprobantes',
    loadChildren: () => import('./comprobantes/comprobantes.module').then((m) => m.ComprobantesModule),
  },
  {
    path: 'clientes',
    loadChildren: () => import('./clientes/clientes.module').then((m) => m.ClientesModule),
  },
  {
    path: 'pedidos',
    loadChildren: () => import('./pedidos/pedidos.module').then((m) => m.PedidosModule),
  },
  {
    path: 'ventas',
    loadChildren: () => import('./ventas/ventas.module').then((m) => m.VentasModule),
  },
  {
    path: 'historial-ventas',
    loadChildren: () => import('./historial-ventas/historial-ventas.module').then((m) => m.HistorialVentasModule),
  },
  {
    path: 'empleados',
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
