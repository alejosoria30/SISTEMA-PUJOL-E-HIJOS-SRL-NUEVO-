import { Component, OnInit } from '@angular/core';
import { StateService, Receipt } from '../state.service';

@Component({
  selector: 'app-historial-ventas',
  templateUrl: './historial-ventas.component.html',
  styleUrls: [],
})
export class HistorialVentasComponent implements OnInit {
  receipts: Receipt[] = [];

  // Filter criteria
  searchQuery = '';
  selectedMethod = '';
  selectedChannel = '';
  selectedDate = '';

  // Invoice / Receipt Drawer
  showReceiptModal = false;
  activeReceipt: Receipt | null = null;

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    this.stateService.receipts$.subscribe(data => {
      this.receipts = [...data].reverse(); // Show most recent first
    });
  }

  // Summary calculations based on total receipts
  getTotalRevenue(): number {
    return this.receipts.reduce((sum, r) => sum + r.total, 0);
  }

  getTotalCash(): number {
    return this.receipts
      .filter(r => r.method === 'Efectivo')
      .reduce((sum, r) => sum + r.total, 0);
  }

  getTotalTransfer(): number {
    return this.receipts
      .filter(r => r.method === 'Transferencia')
      .reduce((sum, r) => sum + r.total, 0);
  }

  getFilteredReceipts(): Receipt[] {
    return this.receipts.filter(r => {
      // Filter by text search (Client name, ID or product details)
      const matchSearch = !this.searchQuery || 
        r.clientName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        r.id.toString().includes(this.searchQuery) ||
        r.details.some(d => d.productName.toLowerCase().includes(this.searchQuery.toLowerCase()));

      // Filter by Payment Method
      const matchMethod = !this.selectedMethod || r.method === this.selectedMethod;

      // Filter by Sales Channel
      const matchChannel = !this.selectedChannel || r.channel === this.selectedChannel;

      // Filter by Date
      const matchDate = !this.selectedDate || r.date === this.selectedDate;

      return matchSearch && matchMethod && matchChannel && matchDate;
    });
  }

  viewReceipt(receipt: Receipt) {
    this.activeReceipt = receipt;
    this.showReceiptModal = true;
  }

  closeReceiptModal() {
    this.showReceiptModal = false;
    this.activeReceipt = null;
  }

  printAction() {
    window.print();
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedMethod = '';
    this.selectedChannel = '';
    this.selectedDate = '';
  }
}
