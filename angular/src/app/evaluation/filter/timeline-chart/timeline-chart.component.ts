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
  years: string;
  count: string;
  dataSub: Subscription;
  translationSub: Subscription;
  ready = false;
  isYear: boolean;
  isMonth: boolean;
  isWeek: boolean;
  xAxis: string;
  timeLineChartData
  intervals = {
    minYear : 0,
    maxYear : 0,
    minMonth: 0,
    maxMonth: 0,
    minWeek: 0,
    maxWeek: 0
  }

  constructor(
    public translate: TranslateService,
    private _distributeDataService: DistributeDataService,
    private _route: ActivatedRoute
  ) { }

  ngOnInit() {
    // get min/max year and min/max month for computing the range on the x axis
    this._paramSub = this._route.queryParams.subscribe(
      params => {
        this.intervals.minYear = this.extractYear(params['from']);
        this.intervals.maxYear = this.extractYear(params['to']);
        this.intervals.minMonth = this.extractMonth(params['from'])+1;
        this.intervals.maxMonth = this.extractMonth(params['to'])+1;
        this.intervals.minWeek = this.extractWeek(params['from']);
        this.intervals.maxWeek = this.extractWeek(params['to']);
        this.getIntervalUnit(params['from'], params['to']);
      }
    )
    //if(this.intervals.minYear === this.intervals.maxYear) {this.isYear = false; }
    this.dataSub = this._distributeDataService.currentData.subscribe(
      data => {
        this.years = this.extractYears(data);
        console.log(this.years)
        // Translate if new data is loaded
        this.translationSub = this.translate.get([
          'EVALUATION.YEAR',
          'EVALUATION.COUNT',
          'EVALUATION.QUARTER'])
          .subscribe(
            texts => {
              this.year = texts['EVALUATION.YEAR'];
              this.count = texts['EVALUATION.COUNT'];
              this.timeLineChartData = this.extract(data);
              this.ready = true;
              this.drawChart(); 
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
  
  private setCategories(): number[] | string[] {
    if (this.isYear) {
      this.xAxis = this.year;
      return this.getInterval(this.intervals.minYear, this.intervals.maxYear);
    } else if(this.isMonth) {
      this.xAxis = `Monat [Jahr: ${this.years}]`
      return this.getInterval(this.intervals.minMonth, this.intervals.maxMonth).map( (el: number) => this.numbersToMonths(el));
    } else {
      this.xAxis = `Woche [Jahr: ${this.years}]`
      return this.getInterval(this.intervals.minWeek, this.intervals.maxWeek);
    }
  }

  private extract(data: Report[]) {
    let min =0; let max=0;
    // case when we are in the same year (from-to)
    if(this.intervals.minYear === this.intervals.maxYear) {
      // scale down to weeks if interval distance between months <= 3
      if(this.intervals.maxMonth - this.intervals.minMonth <= 3) {
        min = this.intervals.minWeek;
        max = this.intervals.maxWeek;
      // if we don not scale weeks, we scale to months
      } else {
        min = this.intervals.minMonth;
        max = this.intervals.maxMonth;
      }
    // case when we are in the two consecutive years (e.g 2017, 2018) AND we have to scale the axis
    } else if(this.intervals.minYear+1 === this.intervals.maxYear) {
      if (this.isMonth) {
        min = this.intervals.minMonth;
        max = this.intervals.maxMonth;
      }
      if( this.isWeek) {
        min = this.intervals.minWeek;
        max = this.intervals.maxWeek;
      }
    // default case, that is: > 1 year
    } else {
      min = this.intervals.minYear;
      max = this.intervals.maxYear
    }
    return this.aggregate(data, this.getInterval(min, max));
  }

  // TODO: Replace this ugly vanilla js method by something that works faster
  private aggregate(data: Report[], timeUnit: number[]) {
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
      auszurottende_seuchen.push({year: timeUnit[i], count : 0})
      hochansteckende_seuchen.push({year: timeUnit[i], count : 0})
      zu_bekämpfende_seuchen.push({year: timeUnit[i], count : 0})
      zu_überwachende_seuchen.push({year: timeUnit[i], count : 0})
      aggregierte_seuchen.push({year: timeUnit[i], count : 0})

      let count1=0; // auszurottende Seuchen
      let count2=0; // hochansteckende Seuchen
      let count3=0; // zu bekämpfende Seuchen
      let count4=0; // zu überwachende Seuchen
      let count5=0; // aggregierte Seuchen
      
      for (const d of data) {
        let compareUnit: number; 
        //= this.isYear ? moment(d['diagnose_datum']['value']).year() : moment(d['diagnose_datum']['value']).month()+1;
        if (this.isYear) {
          compareUnit =  moment(d['diagnose_datum']['value']).year();
        } else if (this.isMonth){
          compareUnit = moment(d['diagnose_datum']['value']).month()+1;
        } else {
          compareUnit = moment(d['diagnose_datum']['value']).week();
        }
        // start counting epidemic groups
        if( timeUnit[i] ===  compareUnit) {
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

  private extractWeek(date: string | Date): number {
    return moment(this.checkDate(date)).week();
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

  private getInterval(minUnit: number, maxUnit: number): number[] {
    if(this.isMonth && this.intervals.maxYear - this.intervals.minYear > 0) {
      let range = [];
      for(let i=minUnit; i<= 12; i++) {
        range.push(i);
      }
      for(let j=1; j<minUnit; j++) {
        range.push(j);
      }
      return range;
    } else if (this.isWeek && this.intervals.maxYear - this.intervals.minYear > 0) {
      let range = [];
      for (let i = minUnit; i<=52; i++) {
        range.push(i);
      }
      for(let j=1; j <= maxUnit; j++) {
        range.push(j);
      }
      return range;
    } else {
      return _.range(minUnit, maxUnit+1, 1)
    }
   
  }

  private getIntervalUnit(from: Date, to: Date) {
    if( (Math.abs(moment(from).diff(to, 'years'))+1) > 1) {
      this.isYear = true; 
      this.isMonth = false;
      this.isWeek = false;
    } else if ( (Math.abs(moment(from).diff(to, 'months'))+1) > 3) {
      this.isMonth = true;
      this.isYear = false;
      this.isWeek = false;
    } else {
      this.isWeek = true;
      this.isYear = false;
      this.isMonth = false;
    }
    console.log(this.isWeek, this.isMonth, this.isYear)
  }

  private numbersToMonths(el: number) {
    //TODO: translate, use ENUM
    let months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    return months[el-1];
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

