import { Component, OnInit, OnDestroy} from '@angular/core';
import { Chart } from 'angular-highcharts';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Report } from '../../../models/report.model';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { ActivatedRoute } from '@angular/router';
import * as _ from 'lodash';
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
  count: string;
  dataSub: Subscription;
  translationSub: Subscription;
  ready = false;
  isYear: boolean;
  minYear: number;
  maxYear: number;
  minMonth: number;
  maxMonth: number;
  timeLineChartData;

  constructor(
    public translate: TranslateService,
    private _distributeDataService: DistributeDataService,
    private _route: ActivatedRoute
  ) { }

  ngOnInit() {
    // get min/max year and min/max month for computing the range on the x axis
    this._paramSub = this._route.queryParams.subscribe(
      params => {
        this.minYear = this.extractYear(params['from']);
        this.maxYear = this.extractYear(params['to']);
        this.minMonth = this.extractMonth(params['from'])+1;
        this.maxMonth = this.extractMonth(params['to']) +1;
      }
    )
    if(this.minYear === this.maxYear) {this.isYear = false; }
    this.dataSub = this._distributeDataService.currentData.subscribe(
      data => {
        // Translate if new data is loaded
        this.translationSub = this.translate.get([
          'EVALUATION.YEAR',
          'EVALUATION.COUNT',
          'EVALUATION.QUARTER'])
          .subscribe(
            texts => {
              this.year = texts['EVALUATION.YEAR'];
              this.count = texts['EVALUATION.COUNT'];
              this.ready = true;
              this.timeLineChartData = this.extract(data);
              this.drawChart(data); 
            });
      },
      err => console.log(err) // TODO: Improve Error handling
    ); 
  }

  ngOnDestroy() {
    this.translationSub.unsubscribe();
    this.dataSub.unsubscribe();
  }

  // TODO: doesnt work for other languages than DE --> has ty be checked
  drawChart(data: Report[]): void {
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
          text: this.isYear ? this.year : `Monat [Jahr: ${this.extractYears(data)}]`
        }
      },
      yAxis: {
        title: {
          text: this.count
        }
      },
      tooltip: {
        crosshairs: true,
        shared: true
    },
      credits: {
        enabled: false
      },
      colors: this.setColors(),
      plotOptions: {
        spline: {
          marker: {
              radius: 2,
              lineColor: '#666666',
              lineWidth: 1
          }
      }
      },
      series: this.timeLineChartData
    });
  }

  private setColors() {
    const timelinecols = [];
    for (let i = 15; i < 100; i += 20) {
      // http://www-db.deis.unibo.it/courses/TW/DOCS/w3schools/colors/colors_picker.asp-colorhex=A52A2A.html
      timelinecols.push(`hsl(0,100%, ${i}%)`);
    }
    return timelinecols;
  }

  private setCategories(): number[] {
    if (this.isYear && this.minYear !== this.maxYear) {
      return this.fillMissingTimeUnits(this.minYear, this.maxYear);
    } else {
      return this.fillMissingTimeUnits(this.minMonth, this.maxMonth);
    }
  }

  private extract(data: Report[]) {
    let finalChartData;
    // TODO: scale x axis when we have only one year
    if(this.minYear == this.maxYear) {
      // note: January is 0, december 11
      this.isYear = false;
      finalChartData = this.aggregateEpidemicsGroup(data, this.fillMissingTimeUnits(this.minMonth, this.maxMonth));
    } else {
      this.isYear = true;
      //this.fillMissingTimeUnits(years)
      finalChartData = this.aggregateEpidemicsGroup(data, this.fillMissingTimeUnits(this.minYear, this.maxYear));
    }
    return finalChartData;
  }

  // TODO: Replace this ugly vanilla js method by something that works faster
  private aggregateEpidemicsGroup(data: Report[], timeUnit: number[]) {
    console.log(timeUnit)
    let aggregatedEpidemics = [
      { name: 'Aggregierte Seuchen', data: [] },
      { name: 'Auszurottende Seuchen', data: [] },
      { name: 'Hochansteckende Seuchen', data: [] },
      { name: 'Zu bekämpfende Seuchen', data: [] },
      { name: 'Zu überwachende Seuchen', data: [] }
    ];

    let auszurottende_seuchen = [];
    let hochansteckende_seuchen = [];
    let zu_bekämpfende_seuchen= [];
    let zu_überwachende_seuchen = [];
    let aggregierte_seuchen = [];

    for (let i=0; i < timeUnit.length; i++) {
      // initialize objects which will contain counted data
      auszurottende_seuchen.push({
        year: timeUnit[i],
        count : 0
      })
      hochansteckende_seuchen.push({
        year: timeUnit[i],
        count : 0
      })
      zu_bekämpfende_seuchen.push({
        year: timeUnit[i],
        count : 0
      })
      zu_überwachende_seuchen.push({
        year: timeUnit[i],
        count : 0
      })
      aggregierte_seuchen.push({
        year: timeUnit[i],
        count : 0
      })

      let count1=0; // auszurottende Seuchen
      let count2=0; // hochansteckende Seuchen
      let count3=0; // zu bekämpfende Seuchen
      let count4=0; // zu überwachende Seuchen
      let count5=0; // aggregierte Seuchen
      
      for (const d of data) {
        let yearOrMonthToCompare = this.isYear ? moment(d['diagnose_datum']['value']).year() : moment(d['diagnose_datum']['value']).month()+1;
        if( timeUnit[i] ===  yearOrMonthToCompare) {
          switch(d['seuchen_gruppe']['value']) {
            case "Auszurottende Seuchen":
              count1 += 1; count5 += 1;
              aggregierte_seuchen[i]['count'] = count5;
              auszurottende_seuchen[i]['count'] = count1;
              break;
            case "Hochansteckende Seuchen":
              count2 += 1; count5 += 1;
              aggregierte_seuchen[i]['count'] = count5;
              hochansteckende_seuchen[i]['count'] = count2; 
              break;
            case "Zu bekämpfende Seuchen":
              count3 +=1; count5 += 1;
              aggregierte_seuchen[i]['count'] = count5;
              zu_bekämpfende_seuchen[i]['count'] = count3; 
              break;
            case "Zu überwachende Seuchen":
              count4 += 1; count5 += 1;
              aggregierte_seuchen[i]['count'] = count5;
              zu_überwachende_seuchen[i]['count'] = count4; 
              break;
          }
        }
      }
    }

    for (let i=0; i < timeUnit.length; i++) {
      aggregatedEpidemics[0].data.push(aggregierte_seuchen[i]['count']);
      aggregatedEpidemics[1].data.push(auszurottende_seuchen[i]['count']);
      aggregatedEpidemics[2].data.push(hochansteckende_seuchen[i]['count']);
      aggregatedEpidemics[3].data.push(zu_bekämpfende_seuchen[i]['count']);
      aggregatedEpidemics[4].data.push(zu_überwachende_seuchen[i]['count']);
    }
    console.log(aggregatedEpidemics)
    return aggregatedEpidemics;
  }

  private extractYear(date: string | Date): number {
    return moment(this.checkDate(date)).year();
  }

  private extractYears(data: Report[]) {
    return _.uniq(this.getDates(data).map(date => this.extractYear(date))).sort();
  }

  private extractMonth(date: string | Date): number {
    return moment(this.checkDate(date)).month();
  }

  private extractMonths(data: Report[]) {
    return _.uniq(this.getDates(data).map(date=> this.extractMonth(date))).sort( (a: number, b: number) => {
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
      if (e.diagnose_datum) {
        dates.push(e.diagnose_datum['value']); // TODO: Change interface
      }
    }
    return dates;
  }

  private fillMissingTimeUnits(minUnit: number, maxUnit: number): number[] {
    return _.range(minUnit, maxUnit+1, 1)
  }

  // TODO: implement these two functions when animal groups are available
  private showEpidemics() {
    console.log('epidemics selected')
  }

  private showAnimals() {
    console.log('animals selected')
  }

}

// private extractChartData(data: Report []) {
  //   const aggregateEpidemicsPerQuarter = [{
  //       name: `1. ${this.quarter}`, data: []
  //     },
  //     {
  //       name: `2. ${this.quarter}`, data: []
  //     },
  //     {
  //       name: `3. ${this.quarter}`, data: []
  //     },
  //     {
  //       name: `4. ${this.quarter}`, data: []
  //     }
  //   ];
  //   const dates = this.getDates(data);
  //   const years = this.extractYears(data);
  //   // Count pest occurances per quarter per year
  //   for (const year of years) {
  //     const pestPerQuater: number[] = [];
  //     for (const date of dates) {
  //       if (year === this.extractYear(date)) {
  //         pestPerQuater.push(moment(date).quarter());
  //       }
  //     }
  //     const count = _.countBy(pestPerQuater);
  //     for (const q of ['1', '2', '3', '4']) {
  //       // Push 0 if no epidemic per quarter
  //       if (!Object.keys(count).includes(q)) {
  //         count[q] = 0;
  //       }
  //     }
  //     // Add counts for each year to every quarters data arr
  //     aggregateEpidemicsPerQuarter.forEach((quarter, i) => {
  //       quarter.data.push(count[(i + 1).toString()]);
  //     });
  //   }
  //   return aggregateEpidemicsPerQuarter;
  // }

