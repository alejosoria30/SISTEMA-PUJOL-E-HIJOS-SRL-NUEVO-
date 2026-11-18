import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface ResumenPersonal {
  empleados: number;
  empleadosActivos: number;
  perfiles: number;
  permisos: number;
  clientesHistoricos: number;
}

@Component({
  selector: 'app-personal-accesos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './personal-accesos.component.html',
  styleUrls: ['./personal-accesos.component.scss'],
})
export class PersonalAccesosComponent implements OnInit {
  resumen: ResumenPersonal | null = null;
  cargando = true;
  errorResumen = '';

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void { this.cargarResumen(); }

  cargarResumen(): void {
    this.cargando = true;
    this.errorResumen = '';
    this.http.get<ResumenPersonal>(`${environment.apiUrl}/personal/resumen`).pipe(timeout(12000)).subscribe({
      next: respuesta => {
        this.resumen = respuesta;
        this.cargando = false;
      },
      error: error => {
        this.cargando = false;
        this.errorResumen = error?.error?.message || 'No se pudo obtener el resumen del personal.';
      },
    });
  }
}
