import { Component, OnInit, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../shared/services/language.service';
import { Subscription } from 'rxjs';
import { NotificationService } from '../shared/services/notification.service';

@Component({
  selector: 'app-home',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.css']
})
export class InfoComponent implements OnInit, OnDestroy {

  private _langSub: Subscription;
  public currentLang: string;

  constructor(
    public translator: TranslateService,
    private _langauageService: LanguageService,
    private _notification: NotificationService
  ) { }

  ngOnInit() {
    this._langSub = this._langauageService.currentLang.subscribe(
      lang => {
       this.currentLang = lang;
      }, err => {
        this._notification.errorMessage(err.statusText + '<br>' + 'language error', err.name);
      }
    );

  }

  onScrollUp(): void {
    window.scrollTo(0, 0);
  }

  ngOnDestroy() {
    this._langSub.unsubscribe();
  }

}
