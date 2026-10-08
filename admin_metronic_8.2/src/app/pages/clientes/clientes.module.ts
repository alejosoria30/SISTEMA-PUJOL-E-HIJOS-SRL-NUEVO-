import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClientesComponent } from './clientes.component';
import { SharedModule } from 'src/app/_metronic/shared/shared.module';

@NgModule({
  declarations: [ClientesComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: ClientesComponent,
      },
    ]),
  ],
})
export class ClientesModule {}
