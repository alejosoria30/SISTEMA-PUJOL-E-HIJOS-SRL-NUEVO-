import { Component, HostBinding, OnInit } from '@angular/core';
import { LayoutService } from '../../../../../layout';
import { StateService } from '../../../../../../pages/state.service';

export type NotificationsTabsType =
  | 'kt_topbar_notifications_1'
  | 'kt_topbar_notifications_2'
  | 'kt_topbar_notifications_3';

@Component({
  selector: 'app-notifications-inner',
  templateUrl: './notifications-inner.component.html',
})
export class NotificationsInnerComponent implements OnInit {
  @HostBinding('class') class =
    'menu menu-sub menu-sub-dropdown menu-column w-350px w-lg-375px';
  @HostBinding('attr.data-kt-menu') dataKtMenu = 'true';

  activeTabId: NotificationsTabsType = 'kt_topbar_notifications_1'; // Alertas por defecto
  alerts: Array<AlertModel> = [];
  logs: Array<LogModel> = [];
  
  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    // Escuchar cambios de stock para alertas
    this.stateService.stock$.subscribe((stockItems: any[]) => {
      this.generateAlerts();
    });

    // Escuchar cambios en recibos para logs
    this.stateService.receipts$.subscribe((receipts: any[]) => {
      this.generateLogs();
    });
  }

  generateAlerts() {
    this.alerts = [];
    const stockItems = this.stateService.stock$.value;
    
    // Check critical stock
    const lowStock = stockItems.filter((s: any) => s.quantity <= s.minThreshold);
    if (lowStock.length > 0) {
      const names = lowStock.map((s: any) => s.name).join(', ');
      this.alerts.push({
        title: 'Stock Crítico de Insumos',
        description: `${names} están en o bajo el mínimo.`,
        time: 'Ahora',
        icon: 'icons/duotune/general/gen044.svg',
        state: 'danger',
      });
    }

    // Check receipts
    const receipts = this.stateService.receipts$.value;
    if (receipts.length > 0) {
      const last = receipts[receipts.length - 1];
      this.alerts.push({
        title: 'Nueva Venta Registrada',
        description: `Cobro por ${last.total}$ con ${last.method}.`,
        time: 'Reciente',
        icon: 'icons/duotune/finance/fin006.svg',
        state: 'success',
      });
    }

    // Fallbacks si no hay
    if (this.alerts.length === 0) {
       this.alerts.push({
        title: 'Sistema al día',
        description: 'No hay alertas críticas en este momento.',
        time: 'Ahora',
        icon: 'icons/duotune/general/gen048.svg',
        state: 'info',
      });
    }
  }

  generateLogs() {
    this.logs = [];
    const receipts = this.stateService.receipts$.value;
    const last3 = [...receipts].reverse().slice(0, 5);
    
    last3.forEach(r => {
      this.logs.push({
        code: 'VENTA',
        state: 'success',
        message: `Venta #${r.id} a ${r.clientName} por $${r.total}`,
        time: r.date.split('T')[0]
      });
    });

    if (this.logs.length === 0) {
      this.logs.push({ code: 'INFO', state: 'info', message: 'No hay actividad reciente registrada', time: 'Ahora' });
    }
  }

  setActiveTabId(tabId: NotificationsTabsType) {
    this.activeTabId = tabId;
  }
}

interface AlertModel {
  title: string;
  description: string;
  time: string;
  icon: string;
  state: 'primary' | 'danger' | 'warning' | 'success' | 'info';
}

interface LogModel {
  code: string;
  state: 'success' | 'danger' | 'warning' | 'info';
  message: string;
  time: string;
}
