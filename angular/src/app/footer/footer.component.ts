import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {

  constructor(
    private _translateService: TranslateService
  ) { }

  ngOnInit() {
  }

  onNavigateContact(): string {
    return `https://www.blv.admin.ch/blv/${this._translateService.currentLang}/home/das-blv/organisation/kontakt.html`;
  }

  onNavigateLegal(): string {
    switch (this._translateService.currentLang) {
      case 'fr':
        return 'https://www.admin.ch/gov/fr/accueil/conditions-utilisation.html';
      case 'it':
        return 'https://www.admin.ch/gov/it/pagina-iniziale/basi-legali.html';
      case 'en':
        return 'https://www.admin.ch/gov/en/start/terms-and-conditions.html';
      default:
        return 'https://www.admin.ch/gov/de/start/rechtliches.html';
    }
  }
}
