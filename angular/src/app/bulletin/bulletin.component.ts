import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Report } from '../shared/models/report.model';
import { SparqlDataService } from 'src/app/shared/services/sparql-data.service';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from '../shared/services/notification.service';
import {
  NgbDateParserFormatter,
  NgbDate,
  NgbDateStruct
} from '@ng-bootstrap/ng-bootstrap';
import { NgbDateCHFormatter } from '../shared/formatters/ngb-ch-date-formatter';
import { SubscriptionManagerService } from '../shared/services/subscription-manager.service';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { LanguageService } from '../shared/services/language.service';
dayjs.extend(weekOfYear);

@Component({
  selector: 'app-bulletin',
  templateUrl: './bulletin.component.html',
  styleUrls: ['./bulletin.component.css'],
  providers: [{ provide: NgbDateParserFormatter, useClass: NgbDateCHFormatter }]
})
export class BulletinComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  hoveredDate: NgbDate;
  from: NgbDate;
  to: NgbDate;
  noData: boolean;

  fromDate: string | Date;
  toDate: string | Date;

  reports: Report[];
  // TODO: Store with state manager
  setLanguage: string;

  maxDate: NgbDateStruct;
  selectedDate: NgbDateStruct;
  displayedCols = [
    'publication_date',
    'canton',
    'munic',
    'epidemic_group',
    'epidemic',
    'animal_species',
    'count'
  ];

  constructor(
    private _sparqlDataService: SparqlDataService,
    private _langService: LanguageService,
    private _notification: NotificationService,
    private _subscriptionManagerService: SubscriptionManagerService,
    public translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.setLanguage = this.translateService.currentLang;
    const lastWeekToday = dayjs()
      .subtract(7, 'd')
      .format('YYYY-MM-DD');
    const selectedRange = this.extractDateRange(lastWeekToday);
    // max possible date to show in calendar is the last day of last week
    this.maxDate = this.transformToNgbDate(selectedRange[1]);

    // the start date is the actual bulletin from last week
    this.selectedDate = this.transformToNgbDate(lastWeekToday);
    this.updateCalendarDates(lastWeekToday);

    this.getReports(
      this.translateService.currentLang,
      selectedRange[0],
      selectedRange[1]
    );

    // If new language selected refetch data
    this._subscriptionManagerService.add(
      this._langService.currentLang.subscribe(
        lang => {
          if (this.setLanguage !== lang) {
            // TODO: Move to NgRx
            this.setLanguage = lang;
            this.getReports(lang, this.fromDate, this.toDate);
          }
        },
        err => {
          // TODO: Imporve error handling
          this._notification.errorMessage(
            err.statusText + '<br>' + 'language error',
            err.name
          );
        }
      )
    );
  }

  ngOnDestroy(): void {
    this._subscriptionManagerService.unsubscribe();
  }

  onDateSelection(date: NgbDate) {
    this.updateCalendarDates(`${date.year}-${date.month}-${date.day}`);
    this.getReports(
      this.translateService.currentLang,
      this.fromDate,
      this.toDate
    );
  }

  onScrollUp(): void {
    window.scrollTo(0, 0);
  }

  isHovered(date: NgbDate): boolean {
    return (
      this.from &&
      !this.to &&
      this.hoveredDate &&
      date.after(this.from) &&
      date.before(this.hoveredDate)
    );
  }

  isInside(date: NgbDate): boolean {
    return date.after(this.from) && date.before(this.to);
  }

  isRange(date: NgbDate): boolean {
    return (
      date.equals(this.from) ||
      date.equals(this.to) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }
  private isEquivalent(a: Report, b: Report): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private getDistinctArray(arr: Report[]): Report[] {
    return [...new Set(arr.map(s => JSON.stringify(s)))].map(s =>
      JSON.parse(s)
    );
  }

  private updateCalendarDates(date: string): void {
    const selectedRange = this.extractDateRange(date);
    this.fromDate = selectedRange[0];
    this.toDate = selectedRange[1];
    this.to = this.transformToNgbDate(this.toDate);
    this.from = this.transformToNgbDate(this.fromDate);
  }

  /**
   * TODO: Replace with Zazuko API
   * Main data retrieval method. Query data as `Report` from remote endpoint.
   * The received data is transfomed into a more descriptive collection.
   *
   * @param lang Language in which the data is queried
   * @param from Date from which on the disease was published
   * @param to Date to which the disease might have been published
   */
  private getReports(
    lang: string,
    from: string | Date,
    to: string | Date
  ): void {
    this._subscriptionManagerService.add(
      this._sparqlDataService
        .getReports('publikations_datum', lang, from, to)
        .subscribe(
          data => {
            const tidyReports = data.map(report => {
              return {
                publication_date: report.publikations_datum.value,
                canton: report.kanton.value,
                munic: report.gemeinde.value,
                epidemic_group: report.seuchen_gruppe.value,
                epidemic: report.seuche.value,
                animal_group: report.tier_gruppe.value,
                animal_species: report.tierart.value,
                count: 1
              } as Report;
            });
            // Remove all duplicates
            const distinctReports: Report[] = this.getDistinctArray(
              tidyReports
            );
            // Sum up identical reports
            if (tidyReports.length !== distinctReports.length) {
              distinctReports.forEach(report => {
                let count = -1; // Each element will already be present at least once
                tidyReports.forEach(el => {
                  if (this.isEquivalent(report, el)) count++;
                });
                report.count += count;
              });
            }
            this.reports = [...distinctReports];
          },
          err => {
            // TODO: Imporve error handling

            this._notification.errorMessage(
              err.statusText + '<br>' + 'reports error',
              err.name
            );
            console.log(err);
          }
        )
    );
  }

  private transformToNgbDate(date: string | Date): any {
    const d = new Date(date);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }

  private extractDateRange(date: string): [string, string] {
    const dayOfWeek = dayjs(date).day() - 1 >= 0 ? dayjs(date).day() - 1 : 6; // 0 -> Monday
    const weekStart = dayjs(date).subtract(Math.abs(0 - dayOfWeek), 'day');
    const weekEnd = dayjs(weekStart).add(6, 'day');
    return [weekStart.format('YYYY-MM-DD'), weekEnd.format('YYYY-MM-DD')];
  }
}
