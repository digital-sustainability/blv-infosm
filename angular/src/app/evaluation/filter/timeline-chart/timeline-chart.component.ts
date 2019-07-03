import { Component, OnInit, OnDestroy} from '@angular/core';
import { Chart } from 'angular-highcharts';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { NotificationService } from '../../../shared/notification.service';
import { ActivatedRoute } from '@angular/router';
import { Report } from '../../../shared/models/report.model';
import { Translations } from '../../../shared/models/translations.model';
import { Line } from '../../../shared/models/line.model';
import { HighchartService } from 'src/app/shared/highchart.service';
import { uniq, uniqBy, range, countBy, mapKeys, get } from 'lodash';
import * as moment from 'moment';

@Component({
  selector: 'app-timeline-chart',
  templateUrl: './timeline-chart.component.html',
  styleUrls: ['./timeline-chart.component.css']
})
export class TimelineChartComponent implements OnInit, OnDestroy {
  _paramSub: Subscription;
  reports: Report[];
  timelineChart: Chart;
  years: string;
  dataSub: Subscription;
  translationSub: Subscription;
  isYear: boolean;
  isMonth: boolean;
  isWeek: boolean;
  xAxis: string;
  trans: Translations;
  timeLineChartData: Line[];
  intervals = {
    minYear : 0,
    maxYear : 0,
    minMonth: 0,
    maxMonth: 0,
    minWeek: 0,
    maxWeek: 0
  };

  constructor(
    public translate: TranslateService,
    private _distributeDataService: DistributeDataService,
    private _route: ActivatedRoute,
    private _highChartService: HighchartService,
    private _notification: NotificationService
  ) { }

  ngOnInit() {
    // get min/max year and min/max month for computing the range on the x axis
    this._paramSub = this._route.queryParams.subscribe(
      params => {
        this.intervals.minYear = this.extractYear(params['from']);
        this.intervals.maxYear = this.extractYear(params['to']);
        this.intervals.minMonth = this.extractMonth(params['from']) + 1;
        this.intervals.maxMonth = this.extractMonth(params['to']) + 1;
        this.intervals.minWeek = this.extractWeek(params['from']);
        this.intervals.maxWeek = this.extractWeek(params['to']);
        this.getIntervalUnit(params['from'], params['to']);
      }
    );
    // if(this.intervals.minYear === this.intervals.maxYear) {this.isYear = false; }
    this.dataSub = this._distributeDataService.currentData.subscribe(
      data => {
        if (data) {
          /**
           * TODO: Only need for Epidemic group && Animal group
           */
          this.reports = data;
          this.years = this.extractYears(data);
          // Translate if new data is loaded
          this.translationSub = this.translate.get([
            'EVAL.WEEK_LABEL',
            'EVAL.MONTHS',
            'EVAL.MONTH_LABEL',
            'EVAL.YEAR',
            'EVAL.YEAR_LABEL',
            'EVAL.YEARS_LABEL',
            'EVAL.AGGR_ANIMAL_GROUPS',
            'EVAL.AGGR_EPIDEMIC_GROUPS',
            'EVAL.COUNT',
            'EVAL.SHOW_ALL_NONE']).subscribe(
              texts => {
                // Obj that holds all tarnslations for this component
                this.trans = texts;
                this.timeLineChartData = this.extract(data, 'epidemic_group');
                this.drawChart();
              }
            );
        }
      },
      // TODO: Improve Error handling
      err => this._notification.errorMessage(err.statusText + '<br>' + err.message , err.name)
    );
  }

  ngOnDestroy() {
    this.translationSub.unsubscribe();
    this.dataSub.unsubscribe();
  }

  drawChart(): void {
    this.timelineChart = new Chart({
      chart: {
        type: 'spline'
      },
      title: {
        text: undefined
      },
      xAxis: {
        categories: this.setCategories(),
        title: {
          text: this.xAxis
        }
      },
      yAxis: {
        allowDecimals: false,
        title: {
          text: this.trans['EVAL.COUNT']
        }
      },
      legend: {
        itemHoverStyle: {
          color: '#999999',
        }
      },
      tooltip: {
        crosshairs: true,
        shared: true
    },
      credits: {
        enabled: false
      },
      colors: this._highChartService.getColors(),
      plotOptions: {
        spline: {
          marker: {
              radius: 2,
              lineColor: '#666666',
              lineWidth: 1
          },
          events: {
            /**
             * Toggle all legend items via service.
             * Use a service because the function needs both access to
             * class scope and highchart scope of `this`
             */
            legendItemClick: this.onPointClick
          }
        },
      },
      /**
       * Array holding each line as `{ name: string, data: number[] }`
       * Concat another empty line to add an additional label for `toggleLegend()`
       */
      series: this.timeLineChartData.concat({
        name: this.trans['EVAL.SHOW_ALL_NONE'],
        data: [],
        marker: { enabled: false },
        color: '#ffffff' // Hide line symbol
      })
    });
  }

  onPointClick = (event: any): boolean => {
      return this._highChartService.toggleLegend(event);
  }

  private setCategories(): number[] | string[] {
    const countYears = this.years.length;
    if (this.isYear) {
      this.xAxis = this.trans['EVAL.YEAR_LABEL'];
      return this.getInterval(this.intervals.minYear, this.intervals.maxYear);
    } else if (this.isMonth) {
      this.xAxis = (countYears === 1) ?
        `${this.trans['EVAL.MONTH_LABEL']} (${this.trans['EVAL.YEAR_LABEL']}: ${this.years[0]})` :
        `${this.trans['EVAL.MONTH_LABEL']} (${this.trans['EVAL.YEARS_LABEL']}: ${this.years[0]}, ${this.years[1]})`;
      return this.getInterval(this.intervals.minMonth, this.intervals.maxMonth).map(
        (el: number) => this.numberToMonth(el, this.trans['EVAL.MONTHS'])
        );
    } else {
      this.xAxis = (countYears === 1) ?
        `${this.trans['EVAL.WEEK_LABEL']} (${this.trans['EVAL.YEAR_LABEL']}: ${this.years[0]})` :
        `${this.trans['EVAL.WEEK_LABEL']} (${this.trans['EVAL.YEARS_LABEL']}: ${this.years[0]}, ${this.years[1]})`;
      return this.getInterval(this.intervals.minWeek, this.intervals.maxWeek);
    }
  }

  private extract(data: Report[], target: string): Line[] {

    let min = 0; let max = 0;
    // case when we are in the same year (from-to)
    if (this.intervals.minYear === this.intervals.maxYear) {
      // scale down to weeks if interval distance between months <= 3
      if (this.intervals.maxMonth - this.intervals.minMonth <= 3) {
        min = this.intervals.minWeek;
        max = this.intervals.maxWeek;
      // if we don not scale weeks, we scale to months
      } else {
        min = this.intervals.minMonth;
        max = this.intervals.maxMonth;
      }
    // case when we are in the two consecutive years (e.g 2017, 2018) AND we have to scale the axis
    } else if (this.intervals.minYear + 1 === this.intervals.maxYear) {
      if (this.isMonth) {
        min = this.intervals.minMonth;
        max = this.intervals.maxMonth;
      }
      if ( this.isWeek) {
        min = this.intervals.minWeek;
        max = this.intervals.maxWeek;
      }
    // default case, that is: > 1 year
    } else {
      min = this.intervals.minYear;
      max = this.intervals.maxYear;
    }
    return this.aggregate(data, this.getInterval(min, max), target);
  }

  // TODO: enforce typing. There seem to be two kinds of Report (EN vs. DE)
  private aggregate(reports: Report[], timeUnit: number[], target: string): Line[] {
    // Extract unique the names of all possible targets
    const uniqeKeys = uniqBy(reports.map(report => report[target])).sort();

    // TODO: Add error handling (as higher order function)
    // Prepare collection that is later handed to the plot
    const lines = uniqeKeys.map((uniqeKey: string) => {
      return {
        'name': uniqeKey,
        'data': []
      };
    });

    /**
     * Accpets array of arrays containing reports per time unit.
     * `timeUnitIndex` mirrors the positon the time unit will have in the final data array.
     * Input: `Report[]`
     * Output: [{ data:[419, 654, 341, 0], name: "Aggregierte Seuchen" }, {...}]
    */
    this.extractTargetByTimeUnit(reports, timeUnit).forEach(
        (tragetPerTimeUnit, timeUnitIndex) => {
        // Counts how often target occurs in all reports per time unit
        const countPerTarget = this.countOccurance(target, tragetPerTimeUnit);
        // For each final data obj in collection populate the data array. Add 0 if target does not occur
        lines.forEach(line => {
          mapKeys(countPerTarget, (value, key) => {
            if (key === line.name) {
              line.data.push(countPerTarget[key]);
            }
          });
          if (!line.data[timeUnitIndex]) {
            line.data.push(0);
          }
        });
      }
    );

    // Define name of aggregated line depending on target
    let name: string;
    if (target === 'epidemic_group') {
      name = this.trans['EVAL.AGGR_EPIDEMIC_GROUPS'];
    } else {
      name = this.trans['EVAL.AGGR_ANIMAL_GROUPS'];
    }
    // Create obj that will hold the data for the aggregated line
    const tmpAggregatedTarget = {
      'name': name,
      'data': []
    };
    // Sum up for the value for every time unit
    for (let i = 0; i < timeUnit.length; i++) {
      let aggregat = 0;
      lines.forEach((line: Line) => {
        aggregat += line.data[i];
      });
      tmpAggregatedTarget.data.push(aggregat);
    }
    // Add it as first line
    lines.unshift(tmpAggregatedTarget);
    // Output format: [{ data:[419, 654, 341, 0], name: "Aggregierte Seuchen" }, {...}]
    return lines;
  }


  // Go through all reports and count how many times the target variable occurs in report.
  private countOccurance(target: string, reports: Report[]): any {
    return countBy(reports.map(
      (report: Report) => get(report, target, 'not defined')
    ));
  }

  // Create array of arrays holding reports separated per time unit
  private extractTargetByTimeUnit(reports: Report[], timeUnits: number[]): Report[][] {
    // Create new array per time unit
    const tragetsPerTimeUnit = [];
    timeUnits.forEach((timeUnit: number) => {
        const tmp = reports.filter(report => {
          // return Number(report.diagnosis_date.split('-')[0]) === unit;
          return  this.getCurrentTimeUnit(report.diagnosis_date) === timeUnit;
        });
        tragetsPerTimeUnit.push(tmp);
    });
    return tragetsPerTimeUnit;
  }

  // Extract day, month or year number depending on current interval
  private getCurrentTimeUnit(time: string | Date): Number {
    if (this.isWeek) {
      return Number(moment(time).format('WW'));
    }
    if (this.isMonth) {
      return new Date(time).getMonth() + 1;
    }
    return new Date(time).getFullYear();
  }

  private extractYear(date: string | Date): number {
    return moment(this.checkDate(date)).year();
  }

  private extractYears(data: Report[]): string {
    return uniq(this.getDates(data).map(date => this.extractYear(date))).sort();
  }

  private extractMonth(date: string | Date): number {
    return moment(this.checkDate(date)).month();
  }

  private extractWeek(date: string | Date): number {
    return moment(this.checkDate(date)).week();
  }

  private extractMonths(data: Report[]): number {
    return uniq(this.getDates(data).map(date => this.extractMonth(date))).sort((a: number, b: number) => {
      if (a >= b) {
        return 1;
      }
      return -1;
    });
  }

  private checkDate(date: string | Date): string { // TODO: Don't return today, come up with somehting better
    return (moment(date).isValid()) ? moment(date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
  }

  private getDates(data: Report[]): string[] {
    const dates: string[] = [];
    for (const e of data) {
      if (e['diagnosis_date']) {
        dates.push(<string>e['diagnosis_date']);
      }
    }
    return dates;
  }

  private getInterval(minUnit: number, maxUnit: number): number[] {
    if (this.isMonth && this.intervals.maxYear - this.intervals.minYear > 0) {
      const range = [];
      // TODO: Fix intervals for month
      for (let i = minUnit; i <= 12; i++) {
        range.push(i);
      }
      for (let j = 1; j < minUnit; j++) {
        range.push(j);
      }
      return range;
    } else if (this.isWeek && this.intervals.maxYear - this.intervals.minYear > 0) {
      const range = [];
      for (let i = minUnit; i <= 52; i++) {
        range.push(i);
      }
      for (let j = 1; j <= maxUnit; j++) {
        range.push(j);
      }
      return range;
    } else {
      return range(minUnit, maxUnit + 1, 1);
    }
  }

  private getIntervalUnit(from: Date, to: Date): void {
    if ((Math.abs(moment(to).diff(from, 'years'))) > 1) {
      this.isYear = true;
      this.isMonth = false;
      this.isWeek = false;
    } else if ((Math.abs(moment(from).diff(to, 'months'))) > 3) {
      this.isMonth = true;
      this.isYear = false;
      this.isWeek = false;
    } else {
      this.isWeek = true;
      this.isYear = false;
      this.isMonth = false;
    }
  }

  private numberToMonth(el: number, months: string[]): string {
    if (months.length >= 12) {
      return months[el - 1];
    }
    return '...';
  }

  onShowEpidemics(): void {
    this.timeLineChartData = [];
    this.timeLineChartData = this.extract(this.reports, 'epidemic_group');
    if (this.timeLineChartData) {
      this.drawChart();
    }
  }

  onShowAnimals(): void {
    this.timeLineChartData = [];
    this.timeLineChartData = this.extract(this.reports, 'animal_group');
    if (this.timeLineChartData) {
      this.drawChart();
    }
  }

}
