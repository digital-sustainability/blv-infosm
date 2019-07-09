import { Component, OnInit, OnDestroy} from '@angular/core';
import { Chart } from 'angular-highcharts';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { DistributeDataService } from 'src/app/shared/services/distribute-data.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ActivatedRoute } from '@angular/router';
import { Report } from '../../../shared/models/report.model';
import { Translations } from '../../../shared/models/translations.model';
import { Line } from '../../../shared/models/line.model';
import { HighchartService } from 'src/app/shared/services/highchart.service';
import { uniq, uniqBy, range, countBy, mapKeys, get } from 'lodash';
import * as moment from 'moment';

@Component({
  selector: 'app-timeline-chart',
  templateUrl: './timeline-chart.component.html',
  styleUrls: ['./timeline-chart.component.css']
})
export class TimelineChartComponent implements OnInit, OnDestroy {
  private _years: string;
  private _dataSub: Subscription;
  private _translationSub: Subscription;
  private _isYear: boolean;
  private _isMonth: boolean;
  private _isWeek: boolean;
  private _xAxis: string;
  private _trans: Translations;
  private _timeLineChartData: Line[];
  private _intervals = {
    minYear : 0,
    maxYear : 0,
    minMonth: 0,
    maxMonth: 0,
    minWeek: 0,
    maxWeek: 0
  };

  reports: Report[];
  timelineChart: Chart;
  paramSub: Subscription;

  constructor(
    public translate: TranslateService,
    private _distributeDataService: DistributeDataService,
    private _route: ActivatedRoute,
    private _highChartService: HighchartService,
    private _notification: NotificationService
  ) { }

  ngOnInit() {
    // get min/max year and min/max month for computing the range on the x axis
    this.paramSub = this._route.queryParams.subscribe(
      params => {
        this._intervals.minYear = this.extractYear(params['from']);
        this._intervals.maxYear = this.extractYear(params['to']);
        this._intervals.minMonth = this.extractMonth(params['from']) + 1;
        this._intervals.maxMonth = this.extractMonth(params['to']) + 1;
        this._intervals.minWeek = this.extractWeek(params['from']);
        this._intervals.maxWeek = this.extractWeek(params['to']);
        this.getIntervalUnit(params['from'], params['to']);
      }
    );
    // if(this.intervals.minYear === this.intervals.maxYear) {this.isYear = false; }
    this._dataSub = this._distributeDataService.currentData.subscribe(
      data => {
        if (data) {
          this.reports = data;
          this._years = this.extractYears(data);
          // Translate if new data is loaded
          this._translationSub = this.translate.get([
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
                this._trans = texts;
                this._timeLineChartData = this.extract(data, 'epidemic_group');
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
    this._translationSub.unsubscribe();
    this._dataSub.unsubscribe();
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
          text: this._xAxis
        }
      },
      yAxis: {
        allowDecimals: false,
        title: {
          text: this._trans['EVAL.COUNT']
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
      series: this._timeLineChartData.concat({
        name: this._trans['EVAL.SHOW_ALL_NONE'],
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
    const countYears = this._years.length;
    if (this._isYear) {
      this._xAxis = this._trans['EVAL.YEAR_LABEL'];
      return this.getInterval(this._intervals.minYear, this._intervals.maxYear);
    } else if (this._isMonth) {
      this._xAxis = (countYears === 1) ?
        `${this._trans['EVAL.MONTH_LABEL']} (${this._trans['EVAL.YEAR_LABEL']}: ${this._years[0]})` :
        `${this._trans['EVAL.MONTH_LABEL']} (${this._trans['EVAL.YEARS_LABEL']}: ${this._years[0]}, ${this._years[1]})`;
      return this.getInterval(this._intervals.minMonth, this._intervals.maxMonth).map(
        (el: number) => this.numberToMonth(el, this._trans['EVAL.MONTHS'])
        );
    } else {
      this._xAxis = (countYears === 1) ?
        `${this._trans['EVAL.WEEK_LABEL']} (${this._trans['EVAL.YEAR_LABEL']}: ${this._years[0]})` :
        `${this._trans['EVAL.WEEK_LABEL']} (${this._trans['EVAL.YEARS_LABEL']}: ${this._years[0]}, ${this._years[1]})`;
      return this.getInterval(this._intervals.minWeek, this._intervals.maxWeek);
    }
  }

  private extract(data: Report[], target: string): Line[] {

    let min = 0; let max = 0;
    // case when we are in the same year (from-to)
    if (this._intervals.minYear === this._intervals.maxYear) {
      // scale down to weeks if interval distance between months <= 3
      if (this._intervals.maxMonth - this._intervals.minMonth <= 3) {
        min = this._intervals.minWeek;
        max = this._intervals.maxWeek;
      // if we don not scale weeks, we scale to months
      } else {
        min = this._intervals.minMonth;
        max = this._intervals.maxMonth;
      }
    // case when we are in the two consecutive years (e.g 2017, 2018) AND we have to scale the axis
    } else if (this._intervals.minYear + 1 === this._intervals.maxYear) {
      if (this._isMonth) {
        min = this._intervals.minMonth;
        max = this._intervals.maxMonth;
      }
      if ( this._isWeek) {
        min = this._intervals.minWeek;
        max = this._intervals.maxWeek;
      }
    // default case, that is: > 1 year
    } else {
      min = this._intervals.minYear;
      max = this._intervals.maxYear;
    }
    return this.aggregate(data, this.getInterval(min, max), target);
  }

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
      name = this._trans['EVAL.AGGR_EPIDEMIC_GROUPS'];
    } else {
      name = this._trans['EVAL.AGGR_ANIMAL_GROUPS'];
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
    if (this._isWeek) {
      return Number(moment(time).format('WW'));
    }
    if (this._isMonth) {
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
    if (this._isMonth && this._intervals.maxYear - this._intervals.minYear > 0) {
      const range = [];
      // TODO: Fix intervals for month
      for (let i = minUnit; i <= 12; i++) {
        range.push(i);
      }
      for (let j = 1; j < minUnit; j++) {
        range.push(j);
      }
      return range;
    } else if (this._isWeek && this._intervals.maxYear - this._intervals.minYear > 0) {
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
    if ((Math.abs(moment(to).diff(from, 'months'))) > 12) {
      this._isYear = true;
      this._isMonth = false;
      this._isWeek = false;
    } else if ((Math.abs(moment(from).diff(to, 'months'))) > 3) {
      this._isMonth = true;
      this._isYear = false;
      this._isWeek = false;
    } else {
      this._isWeek = true;
      this._isYear = false;
      this._isMonth = false;
    }
  }

  private numberToMonth(el: number, months: string[]): string {
    if (months.length >= 12) {
      return months[el - 1];
    }
    return '...';
  }

  onShowEpidemics(): void {
    this._timeLineChartData = [];
    this._timeLineChartData = this.extract(this.reports, 'epidemic_group');
    if (this._timeLineChartData) {
      this.drawChart();
    }
  }

  onShowAnimals(): void {
    this._timeLineChartData = [];
    this._timeLineChartData = this.extract(this.reports, 'animal_group');
    if (this._timeLineChartData) {
      this.drawChart();
    }
  }

}
