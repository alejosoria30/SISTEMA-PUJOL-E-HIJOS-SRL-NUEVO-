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
    // Alt + Key shortcuts to navigate sections rapidly in the kitchen
    if (event.altKey) {
      let targetRoute = '';
      switch (event.key.toLowerCase()) {
        case 'd': targetRoute = '/dashboard'; break;
        case 's': targetRoute = '/stock'; break;
        case 'r': targetRoute = '/recetas'; break;
        case 'e': targetRoute = '/pedidos'; break;
        case 'v': targetRoute = '/ventas'; break;
        case 'c': targetRoute = '/clientes'; break;
        case 'm': targetRoute = '/menu-semanal'; break;
        case 'o': targetRoute = '/recetario-costes'; break;
        case 'u': targetRoute = '/empleados'; break;
      }
      if (targetRoute) {
        event.preventDefault();
        this.router.navigate([targetRoute]);
      }
    }
  }
}
