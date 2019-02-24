import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  // Check browser language - set to 'de' if language if language is not supported
  private _browserLang = this.translate.getBrowserLang();
  private _langSrc = new BehaviorSubject(this.checkLang(this._browserLang));
  currentLang = this._langSrc.asObservable();

  constructor(
    private translate: TranslateService,
  ) { }

  changeLang(lang: string) {
    this._langSrc.next(this.checkLang(lang));
  }

  private checkLang(lang: string): string {
    const str = lang.toLocaleLowerCase();
    return str.match(/de|fr|it|en/) ? str : 'de';
  }
}
