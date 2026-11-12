import { ChangeDetectionStrategy, Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from './modules/i18n';
// language list
import { locale as enLang } from './modules/i18n/vocabs/en';
import { locale as chLang } from './modules/i18n/vocabs/ch';
import { locale as esLang } from './modules/i18n/vocabs/es';
import { locale as jpLang } from './modules/i18n/vocabs/jp';
import { locale as deLang } from './modules/i18n/vocabs/de';
import { locale as frLang } from './modules/i18n/vocabs/fr';
import { ThemeModeService } from './_metronic/partials/layout/theme-mode-switcher/theme-mode.service';

@Component({
  // tslint:disable-next-line:component-selector
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'body[root]',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  constructor(
    private translationService: TranslationService,
    private modeService: ThemeModeService,
    private router: Router
  ) {
    // register translations
    this.translationService.loadTranslations(
      enLang,
      chLang,
      esLang,
      jpLang,
      deLang,
      frLang
    );
  }

  ngOnInit() {
    this.modeService.init();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Alt + Key shortcuts to navigate sections rapidly in Pujol e Hijos
    if (event.altKey) {
      let targetRoute = '';
      switch (event.key.toLowerCase()) {
        case 'd': targetRoute = '/dashboard'; break;
        case 's': targetRoute = '/stock'; break;
        case 'c': targetRoute = '/catalogo'; break;
        case 'p': targetRoute = '/pedidos'; break;
        case 'v': targetRoute = '/ventas'; break;
        case 'j': targetRoute = '/caja'; break;
        case 'f': targetRoute = '/comprobantes'; break;
        case 'h': targetRoute = '/historial-ventas'; break;
        case 'l': targetRoute = '/clientes'; break;
        case 'e': targetRoute = '/empleados'; break;
        case 'u': targetRoute = '/apps/users'; break;
      }
      if (targetRoute) {
        event.preventDefault();
        this.router.navigate([targetRoute]);
      }
    }
  }
}
