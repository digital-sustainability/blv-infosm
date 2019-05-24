import { Component, OnInit, OnDestroy} from '@angular/core';
import { Chart } from 'angular-highcharts';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Report } from '../../../models/report.model';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { ActivatedRoute } from '@angular/router';
import { Frequency } from '../../../models/frequency.model';
import { HighchartService } from 'src/app/shared/highchart.service';
import { uniq, range, countBy, mapKeys, orderBy } from 'lodash';
import * as moment from 'moment';

@Component({
  selector: 'app-timeline-chart',
  templateUrl: './timeline-chart.component.html',
  styleUrls: ['./timeline-chart.component.css']
})
export class TimelineChartComponent implements OnInit, OnDestroy {
  _paramSub: Subscription;
  data: Report[];
  timelineChart: Chart;
  year: string;
  years: string;
  count: string;
  allLinesLabel: string;
  dataSub: Subscription;
  translationSub: Subscription;
  ready = false;
  isYear: boolean;
  isMonth: boolean;
  isWeek: boolean;
  xAxis: string;
  timeLineChartData: {
    name: string,
    data: any[]
    marker?: any,
  }[];
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
        this.data = data;
        this.years = this.extractYears(data);
        // console.log(this.years);
        // Translate if new data is loaded
        this.translationSub = this.translate.get([
          'EVALUATION.YEAR',
          'EVALUATION.COUNT',
          'EVALUATION.QUARTER',
          'EVALUATION.SHOW_ALL_NONE'])
          .subscribe(
            texts => {
              this.year = texts['EVALUATION.YEAR'];
              this.count = texts['EVALUATION.COUNT'];
              this.allLinesLabel = texts['EVALUATION.SHOW_ALL_NONE'];
              this.timeLineChartData = this.extract(data, 'epidemics');
              this.ready = true;
              this.drawChart();
            }
          );
      },
      err => console.log(err) // TODO: Improve Error handling
    );
  }

  ngOnDestroy() {
    this.translationSub.unsubscribe();
    this.dataSub.unsubscribe();
  }

  // TODO: doesnt work for other languages than DE --> has ty be checked
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
          text: this.count
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
      series: this.timeLineChartData
        .concat({
          name: this.allLinesLabel,
          data: [],
          marker: { enabled: false }
        })
    });
  }

  onPointClick = (event: any): boolean => {
      return this._highChartService.toggleLegend(event);
  }

  private setCategories(): number[] | string[] {
    const countYears = this.years.length;
    if (this.isYear) {
      this.xAxis = this.year;
      return this.getInterval(this.intervals.minYear, this.intervals.maxYear);
    } else if (this.isMonth) {
      this.xAxis = (countYears === 1) ? `Monat (Jahr: ${this.years[0]})` : `Monat (Jahre: ${this.years[0]}, ${this.years[1]})`;
      return this.getInterval(this.intervals.minMonth, this.intervals.maxMonth).map( (el: number) => this.numbersToMonths(el));
    } else {
      this.xAxis = (countYears === 1) ? `Woche (Jahr: ${this.years[0]})` : `Woche (Jahre: ${this.years[0]}, ${this.years[1]})`;
      return this.getInterval(this.intervals.minWeek, this.intervals.maxWeek);
    }
  }

  private extract(data: Report[], method: string) {

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
    if (method === 'epidemics') {
      return this.aggregate(data, this.getInterval(min, max));
    }
    return this.aggregateT(data, this.getInterval(min, max));
  }

  // TODO: Replace this ugly vanilla js method by something nicer
  private aggregate(data: Report[], timeUnit: number[]) {
    console.log('Goal --> IN', data);
    const aggregatedEpidemics = [
      { name: 'Aggregierte Seuchen', data: [] },
      { name: 'Auszurottende Seuchen', data: [] },
      { name: 'Hochansteckende Seuchen', data: [] },
      { name: 'Zu bekämpfende Seuchen', data: [] },
      { name: 'Zu überwachende Seuchen', data: [] }
    ];

    const auszurottende_seuchen = [];
    const hochansteckende_seuchen = [];
    const zu_bekämpfende_seuchen = [];
    const zu_überwachende_seuchen = [];
    const aggregierte_seuchen = [];

    for (let i = 0; i < timeUnit.length; i++) {
      // initialize objects which will contain counted data
      auszurottende_seuchen.push({year: timeUnit[i], count : 0});
      hochansteckende_seuchen.push({year: timeUnit[i], count : 0});
      zu_bekämpfende_seuchen.push({year: timeUnit[i], count : 0});
      zu_überwachende_seuchen.push({year: timeUnit[i], count : 0});
      aggregierte_seuchen.push({year: timeUnit[i], count : 0});

      let count1 = 0; // auszurottende Seuchen
      let count2 = 0; // hochansteckende Seuchen
      let count3 = 0; // zu bekämpfende Seuchen
      let count4 = 0; // zu überwachende Seuchen
      let count5 = 0; // aggregierte Seuchen

      for (const d of data) {
        let compareUnit: number;
        if (this.isYear) {
          compareUnit =  parseInt(d['diagnosis_date'].split('-')[0]);
        } else if (this.isMonth){
          compareUnit = parseInt(d['diagnosis_date'].split('-')[1]);
        } else {
          compareUnit = moment(d['diagnosis_date']).week();
        }
        // start counting epidemic groups
        if (timeUnit[i] ===  (compareUnit)) {
          switch(d['epidemic_group']) {
            case 'Auszurottende Seuchen':
              count1 += 1; count5 += 1;
              aggregierte_seuchen[i]['count'] = count5;
              auszurottende_seuchen[i]['count'] = count1;
              break;
            case 'Hochansteckende Seuchen':
              count2 += 1; count5 += 1;
              aggregierte_seuchen[i]['count'] = count5;
              hochansteckende_seuchen[i]['count'] = count2;
              break;
            case 'Zu bekämpfende Seuchen':
              count3 += 1; count5 += 1;
              aggregierte_seuchen[i]['count'] = count5;
              zu_bekämpfende_seuchen[i]['count'] = count3;
              break;
            case 'Zu überwachende Seuchen':
              count4 += 1; count5 += 1;
              aggregierte_seuchen[i]['count'] = count5;
              zu_überwachende_seuchen[i]['count'] = count4;
              break;
          }
        }
      }
    }

    for (let i = 0; i < timeUnit.length; i++) {
      aggregatedEpidemics[0].data.push(aggregierte_seuchen[i]['count']);
      aggregatedEpidemics[1].data.push(auszurottende_seuchen[i]['count']);
      aggregatedEpidemics[2].data.push(hochansteckende_seuchen[i]['count']);
      aggregatedEpidemics[3].data.push(zu_bekämpfende_seuchen[i]['count']);
      aggregatedEpidemics[4].data.push(zu_überwachende_seuchen[i]['count']);
    }
    console.log('Goal --> OUT', aggregatedEpidemics);
    return aggregatedEpidemics;
    // In: [{
      // animal_group: "Rinder",
      // animal_species: "Rind",
      // canton: "Zürich",
      // community: "Büron",
      // diagnosis_date: "2018-01-15",
      // epidemic: "Campylobacteriose",
      // epidemic_group: "Zu überwachende Seuchen" }, {...}]
    // Out: [{ data:[419, 654, 341, 0], name: "Aggregierte Seuchen" }, {...}]
    // TODO: Replace above
  }

  private countOccurance(target: string, reports: Report[]): Frequency[] {
    const result = [];
    // countBy: count orrurence in array
    // get(obj, pathToValue, defaultValue): check if property exists
    const count = countBy(reports.map(pest => get(pest, target, 'not defined')));
    mapKeys(count, (value: string, key: number): void => {
      result.push({
        name: key,
        y: value
      });
    });
    return result;
  }

  private limitCollection(target: string, data: Report[]) {
    const count = this.countOccurance(target, data);
    return orderBy(count, ['y'], 'desc').slice(0, 6).map(e => e.name);
  }

  private range(count: number, step: number): number[] {
    return Array(count).fill(step).map((x, i) => x + i * step);
  }

  private extractUniqueType(reports: Report[], uniqueType: string): string[] {
    return this.limitCollection(uniqueType, reports).concat(['Other']);
  }

  private aggregateT(data: Report[], timeUnit: number[]) {
    const aggregatedAnimals = [
      { name: 'Aggregierte Tiere', data: [] },
      { name: 'Bienen', data: [] },
      { name: 'Equiden', data: [] },
      { name: 'Fische', data: [] },
      { name: 'Gefluegel', data: [] },
      { name: 'Hund', data: [] },
      { name: 'Kaninchen', data: [] },
      { name: 'Katzen', data: [] },
      { name: 'Reptilien', data: [] },
      { name: 'Rinder', data: [] },
      { name: 'Schafe und Ziegen', data: [] },
      { name: 'Schweine', data: [] },
      { name: 'Wildtier', data: [] },
      { name: 'Wildvogel', data: [] },
      { name: 'andere Hausvoegel', data: [] }
    ];

    const aggregierte_Tiere = []; const Bienen = []; const Equiden = []; const Fische = [];
    const Gefluegel = []; const Hund = []; const Kaninchen = []; const Katzen = []; const Reptilien = [];
    const Rinder = []; const Schafe_und_Ziegen = []; const Schweine = [];
    const Wildtier = []; const Wildvogel = []; const andere_Hausvoegel = [];

    for (let i = 0; i < timeUnit.length; i++) {
      // initialize objects which will contain counted data
      aggregierte_Tiere.push({year: timeUnit[i], count : 0});
      Bienen.push({year: timeUnit[i], count : 0});
      Equiden.push({year: timeUnit[i], count : 0});
      Fische.push({year: timeUnit[i], count : 0});
      Gefluegel.push({year: timeUnit[i], count : 0});
      Hund.push({year: timeUnit[i], count : 0});
      Kaninchen.push({year: timeUnit[i], count : 0});
      Katzen.push({year: timeUnit[i], count : 0});
      Reptilien.push({year: timeUnit[i], count : 0});
      Rinder.push({year: timeUnit[i], count : 0});
      Schafe_und_Ziegen.push({year: timeUnit[i], count : 0});
      Schweine.push({year: timeUnit[i], count : 0});
      Wildtier.push({year: timeUnit[i], count : 0});
      Wildvogel.push({year: timeUnit[i], count : 0});
      andere_Hausvoegel.push({year: timeUnit[i], count : 0});

      let count1 = 0; let count2 = 0; let count3 = 0; let count4 = 0;
      let count5 = 0; let count6 = 0; let count7 = 0; let count8 = 0;
      let count9 = 0; let count10 = 0; let count11 = 0; let count12 = 0;
      let count13 = 0; let count14 = 0; let count15 = 0;

      for (const d of data) {
        let compareUnit: number;
        if (this.isYear) {
          compareUnit = parseInt(d['diagnosis_date'].split('-')[0]);
        } else if (this.isMonth) {
          compareUnit = parseInt(d['diagnosis_date'].split('-')[1]);
        } else {
          compareUnit = moment(d['diagnosis_date']).week();
        }
        // start counting epidemic groups
        if ( timeUnit[i] ===  (compareUnit)) {
          switch(d['animal_group']) {
            case 'Bienen':
              count1 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Bienen[i]['count'] = count1;
              break;
            case 'Equiden':
              count2 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Equiden[i]['count'] = count2;
              break;
            case 'Fische':
              count3 += 1; count5 += 1;
              aggregierte_Tiere[i]['count'] = count15; Fische[i]['count'] = count3;
              break;
            case 'Gefluegel':
              count4 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Gefluegel[i]['count'] = count4;
              break;
            case 'Hund':
              count5 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Hund[i]['count'] = count5;
              break;
            case 'Kaninchen':
              count6 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Kaninchen[i]['count'] = count6;
              break;
            case 'Katzen':
              count7 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Katzen[i]['count'] = count7;
              break;
            case 'Reptilien':
              count8 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Reptilien[i]['count'] = count8;
              break;
            case 'Rinder':
              count9 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Rinder[i]['count'] = count9;
              break;
            case 'Schafe_und_Ziegen':
              count10 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Schafe_und_Ziegen[i]['count'] = count10;
              break;
            case 'Schweine':
              count11 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15;
              Schweine[i]['count'] = count11;
              break;
            case 'Wildtier':
              count12 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Wildtier[i]['count'] = count12;
              break;
            case 'Wildvogel':
              count13 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; Wildvogel[i]['count'] = count13;
              break;
            case 'Zu überwachende Seuchen':
              count14 += 1; count15 += 1;
              aggregierte_Tiere[i]['count'] = count15; andere_Hausvoegel[i]['count'] = count14;
              break;
          }
        }
      }
    }

    for (let i = 0; i < timeUnit.length; i++) {
      aggregatedAnimals[0].data.push(aggregierte_Tiere[i]['count']);
      aggregatedAnimals[1].data.push(Bienen[i]['count']);
      aggregatedAnimals[2].data.push(Equiden[i]['count']);
      aggregatedAnimals[3].data.push(Fische[i]['count']);
      aggregatedAnimals[4].data.push(Gefluegel[i]['count']);
      aggregatedAnimals[5].data.push(Hund[i]['count']);
      aggregatedAnimals[6].data.push(Kaninchen[i]['count']);
      aggregatedAnimals[7].data.push(Katzen[i]['count']);
      aggregatedAnimals[8].data.push(Reptilien[i]['count']);
      aggregatedAnimals[9].data.push(Rinder[i]['count']);
      aggregatedAnimals[10].data.push(Schafe_und_Ziegen[i]['count']);
      aggregatedAnimals[11].data.push(Schweine[i]['count']);
      aggregatedAnimals[12].data.push(Wildtier[i]['count']);
      aggregatedAnimals[13].data.push(Wildvogel[i]['count']);
      aggregatedAnimals[14].data.push(andere_Hausvoegel[i]['count']);
    }
    // console.log(aggregatedAnimals);
    return aggregatedAnimals;
  }

  private extractYear(date: string | Date): number {
    return moment(this.checkDate(date)).year();
  }

  private extractYears(data: Report[]) {
    return uniq(this.getDates(data).map(date => this.extractYear(date))).sort();
  }

  private extractMonth(date: string | Date): number {
    return moment(this.checkDate(date)).month();
  }

  private extractWeek(date: string | Date): number {
    return moment(this.checkDate(date)).week();
  }

  private extractMonths(data: Report[]) {
    return uniq(this.getDates(data).map(date => this.extractMonth(date))).sort( (a: number, b: number) => {
      if (a > b)
        return 1;
      if (a < b)
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
        // dates.push(e.diagnose_datum['value']); // TODO: Change interface
        dates.push(e['diagnosis_date']);
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

  private getIntervalUnit(from: Date, to: Date) {
    if ((Math.abs(moment(from).diff(to, 'years')) + 1) > 1) {
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
    // console.log(this.isWeek, this.isMonth, this.isYear)
  }

  private numbersToMonths(el: number) {
    // TODO: translate, use ENUM
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return months[el - 1];
  }

  showEpidemics() {
    this.timeLineChartData = [];
    this.timeLineChartData = this.extract(this.data, 'epidemics');
    if (this.timeLineChartData) {
      this.drawChart();
    }
  }

  showAnimals() {
    this.timeLineChartData = [];
    this.timeLineChartData = this.extract(this.data, 'animals');
    if (this.timeLineChartData) {
      this.drawChart();
    }
  }

}
