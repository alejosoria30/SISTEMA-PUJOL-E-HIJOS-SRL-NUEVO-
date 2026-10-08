import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ViewChild } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexStroke,
  ApexYAxis,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexLegend,
  ApexFill,
  ApexGrid
} from 'ng-apexcharts';
import { StateService, Order, StockItem, Receipt, Client } from '../state.service';
import { AuthService } from '../../modules/auth/services/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  todaySales = 0;
  urgentOrdersCount = 0;
  lowStockItems: StockItem[] = [];
  vipClientsCount = 0;
  totalLoyaltyPoints = 0;

  recentReceipts: Receipt[] = [];
  urgentOrdersList: Order[] = [];

  // Chart Options
  salesChartOptions: any = {};
  channelChartOptions: any = {};
  stockHealthChartOptions: any = {};

  private subscriptions: Subscription[] = [];

  constructor(
    private stateService: StateService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  get currentUserFullname(): string {
    return this.authService.currentUserValue?.fullname || 'Usuario';
  }

  get hasAnyPermission(): boolean {
    return this.authService.hasAnyPermission();
  }

  get hasDashboardPermission(): boolean {
    return this.authService.hasAction(1, 'read');
  }

  ngOnInit(): void {
    // 1. Sales & Sales Chart
    const receiptsSub = this.stateService.receipts$.subscribe(data => {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayReceipts = data.filter(r => r.date === todayStr);
      this.todaySales = todayReceipts.reduce((sum, r) => sum + r.total, 0);
      this.recentReceipts = [...data].reverse().slice(0, 5);
      
      // Compute last 7 days sales
      const last7DaysSales: number[] = [];
      const last7DaysLabels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last7DaysLabels.push(dateStr.substring(5)); // MM-DD
        
        const dayReceipts = data.filter(r => r.date === dateStr);
        const dayTotal = dayReceipts.reduce((sum, r) => sum + r.total, 0);
        last7DaysSales.push(dayTotal);
      }
      
      this.initSalesChart(last7DaysLabels, last7DaysSales);
      this.cdr.detectChanges();
    });
    this.subscriptions.push(receiptsSub);

    // 2. Orders & Urgency & Channels Chart
    const ordersSub = this.stateService.orders$.subscribe(data => {
      const pendingOrders = data.filter(o => o.status !== 'Entregado' && o.status !== 'Cancelado');
      
      this.urgentOrdersList = pendingOrders.filter(o => {
        const delivery = new Date(o.deliveryTime).getTime();
        const now = new Date().getTime();
        const hoursLeft = (delivery - now) / (1000 * 60 * 60);
        return hoursLeft <= 24;
      });

      this.urgentOrdersCount = this.urgentOrdersList.length;

      // Channels Data
      let presencial = 0;
      let telefonico = 0;
      let web = 0;
      data.forEach(o => {
        if (o.channel === 'presencial') presencial++;
        if (o.channel === 'telefónico') telefonico++;
        if (o.channel === 'reserva web') web++;
      });
      this.initChannelChart([presencial, telefonico, web]);
      
      this.cdr.detectChanges();
    });
    this.subscriptions.push(ordersSub);

    // 3. Stock & Stock Health Chart
    const stockSub = this.stateService.stock$.subscribe(data => {
      this.lowStockItems = data.filter(s => s.quantity < s.minThreshold);
      
      let healthyPercent = 100;
      if (data.length > 0) {
        healthyPercent = Math.round(((data.length - this.lowStockItems.length) / data.length) * 100);
      }
      this.initStockHealthChart(healthyPercent);
      
      this.cdr.detectChanges();
    });
    this.subscriptions.push(stockSub);

    // 4. Clients
    const clientsSub = this.stateService.clients$.subscribe(data => {
      this.vipClientsCount = data.filter(c => c.isVIP).length;
      this.totalLoyaltyPoints = data.reduce((sum, c) => sum + c.points, 0);
      this.cdr.detectChanges();
    });
    this.subscriptions.push(clientsSub);
  }

  getDaysLeft(deliveryTimeStr: string): string {
    const delivery = new Date(deliveryTimeStr).getTime();
    const now = new Date().getTime();
    const diffMs = delivery - now;
    const hoursLeft = diffMs / (1000 * 60 * 60);
    if (hoursLeft < 0) {
      return 'Vencido';
    } else if (hoursLeft <= 2) {
      return 'Entrega Inmediata (<2h)';
    } else {
      return `${Math.ceil(hoursLeft)} horas restantes`;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // --- Chart Initializations ---
  
  initSalesChart(labels: string[], data: number[]) {
    this.salesChartOptions = {
      series: [
        {
          name: 'Ventas ($)',
          data: data
        }
      ],
      chart: {
        height: 350,
        type: 'area',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      colors: ['#28a745'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.05,
          stops: [0, 90, 100]
        }
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: '#a1a5b7', fontSize: '12px' } }
      },
      yaxis: {
        labels: {
          style: { colors: '#a1a5b7', fontSize: '12px' },
          formatter: (val: number) => { return '$' + val.toFixed(0); }
        }
      },
      grid: {
        borderColor: '#eff2f5',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } }
      },
      tooltip: {
        theme: 'light',
        y: { formatter: (val: number) => '$' + val.toFixed(2) }
      }
    };
  }

  initChannelChart(data: number[]) {
    this.channelChartOptions = {
      series: data,
      chart: {
        type: 'donut',
        height: 300,
        fontFamily: 'Inter, sans-serif'
      },
      labels: ['Presencial', 'Telefónico', 'Reserva Web'],
      colors: ['#009ef7', '#50cd89', '#ffc700'],
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: { show: true },
              value: { show: true, formatter: (val: string) => val + ' pedidos' }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      legend: { position: 'bottom' }
    };
  }

  initStockHealthChart(healthyPercent: number) {
    this.stockHealthChartOptions = {
      series: [healthyPercent],
      chart: {
        type: 'radialBar',
        height: 350,
        fontFamily: 'Inter, sans-serif'
      },
      plotOptions: {
        radialBar: {
          startAngle: -90,
          endAngle: 90,
          hollow: {
            margin: 15,
            size: '65%',
          },
          track: {
            background: '#eff2f5',
            strokeWidth: '100%',
          },
          dataLabels: {
            show: true,
            name: {
              show: true,
              fontSize: '16px',
              fontWeight: 600,
              color: '#a1a5b7',
              offsetY: -10
            },
            value: {
              show: true,
              fontSize: '24px',
              fontWeight: 700,
              color: '#181c32',
              offsetY: 16,
              formatter: (val: number) => val + '%'
            }
          }
        }
      },
      fill: {
        type: 'solid',
        colors: [healthyPercent > 70 ? '#50cd89' : (healthyPercent > 40 ? '#ffc700' : '#f1416c')]
      },
      stroke: { lineCap: 'round' },
      labels: ['Salud del Inventario']
    };
  }
}
