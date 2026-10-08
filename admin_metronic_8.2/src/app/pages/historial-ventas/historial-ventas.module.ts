import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/_metronic/shared/shared.module';
import { HistorialVentasComponent } from './historial-ventas.component';

@NgModule({
  declarations: [HistorialVentasComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: HistorialVentasComponent,
      },
    ]),
  ],
})
export class HistorialVentasModule {}
