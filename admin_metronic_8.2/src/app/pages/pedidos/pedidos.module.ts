import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/_metronic/shared/shared.module';
import { PedidosComponent } from './pedidos.component';

@NgModule({
  declarations: [PedidosComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: PedidosComponent,
      },
    ]),
  ],
})
export class PedidosModule {}
