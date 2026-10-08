import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CajaComponent } from './caja.component';
import { SharedModule } from 'src/app/_metronic/shared/shared.module';

@NgModule({
  declarations: [CajaComponent],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: CajaComponent,
      },
    ]),
  ],
})
export class CajaModule {}
