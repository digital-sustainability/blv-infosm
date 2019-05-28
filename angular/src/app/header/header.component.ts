import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../shared/language.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input()
  selectedLang: string;
  private _langSub: Subscription;

  constructor(
    public translate: TranslateService,
    private _langService: LanguageService,
) { }

  ngOnInit() {
    this._langSub = this._langService.currentLang.subscribe(
      lang => {
        this.translate.use(lang);
        this.selectedLang = lang;
      });
  }

  ngOnDestroy() {
    this._langSub.unsubscribe();
  }

  onLangChange(lang: string): void {
    this._langService.changeLang(lang);
  }
}
