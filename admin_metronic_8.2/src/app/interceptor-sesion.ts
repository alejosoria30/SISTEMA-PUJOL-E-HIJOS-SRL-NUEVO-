import { Injectable } from '@angular/core';
import { HttpInterceptor,HttpRequest,HttpHandler } from '@angular/common/http';
import { environment } from 'src/environments/environment';
@Injectable()
export class InterceptorSesion implements HttpInterceptor {
  intercept(solicitud: HttpRequest<any>, siguiente: HttpHandler) {
    if (solicitud.url.startsWith(environment.apiUrl+'/')) {
      const valor=sessionStorage.getItem(environment.appVersion+'-'+environment.USERDATA_KEY);
      const token=valor && JSON.parse(valor).authToken;
      if (token) solicitud=solicitud.clone({setHeaders:{Authorization:'Bearer '+token}});
    }
    return siguiente.handle(solicitud);
  }
}
