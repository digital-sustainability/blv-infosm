import { Injectable } from '@angular/core';
import { NgbDatepickerI18n, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class DatePickerI18nService extends NgbDatepickerI18n {

  // TODO: Move to i18n.jsons
  i18n_values = {
    'en': {
      weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    'de': {
      weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
      months: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
    },
    'fr': {
      weekdays: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
      months: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Déc'],
    },
    'it': {
      weekdays: ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'],
      months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
    }
  };

  constructor(
    public translateService: TranslateService
  ) {
    super();
  }

  getWeekdayShortName(weekday: number): string {
    return this.i18n_values[this.translateService.currentLang].weekdays[weekday - 1];
    // return this.i18n_values['fr'].weekdays[weekday - 1];
  }
  getMonthShortName(month: number): string {
    return this.i18n_values[this.translateService.currentLang].months[month - 1];
    // return this.i18n_values['fr'].months[month - 1];
  }
  getMonthFullName(month: number): string {
    return this.getMonthShortName(month);
  }
  getDayAriaLabel(date: NgbDateStruct): string {
    return `${date.day}-${date.month}-${date.year}`;
  }
}
