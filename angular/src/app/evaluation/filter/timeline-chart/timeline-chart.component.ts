import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart } from 'angular-highcharts';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Report } from '../../../models/report.model';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import * as _ from 'lodash';
import * as moment from 'moment';

@Component({
  selector: 'app-timeline-chart',
  templateUrl: './timeline-chart.component.html',
  styleUrls: ['./timeline-chart.component.css']
})
export class TimelineChartComponent implements OnInit, OnDestroy {

  axis: [];
  data: Report[];
  timelineChart: Chart;
  year: string;
  count: string;
  dataSub: Subscription;
  translationSub: Subscription;
  ready = false;
  quarter = '';

  constructor(
    public translate: TranslateService,
    private _distributeDataService: DistributeDataService
  ) { }

  ngOnInit() {
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
              this.quarter = texts['EVALUATION.QUARTER'];
              this.ready = true;
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

  drawChart(data: Report[]): void {
    this.timelineChart = new Chart({
      chart: {
        type: 'spline'
      },
      title: {
        text: undefined
      },
      xAxis: {
        categories: this.extractYears(data),
        title: {
          text: this.year
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
      series: this.extractChartData(data)
    });
  }

  setColors() {
    const piecols = [];
    for (let i = 15; i < 100; i += 20) {
      // http://www-db.deis.unibo.it/courses/TW/DOCS/w3schools/colors/colors_picker.asp-colorhex=A52A2A.html
      piecols.push(`hsl(0,100%, ${i}%)`);
    }
    return piecols;
  }

  private extractChartData(data: Report []) {
    const aggregateEpidemicsPerQuarter = [{
        name: `1. ${this.quarter}`, data: []
      },
      {
        name: `2. ${this.quarter}`, data: []
      },
      {
        name: `3. ${this.quarter}`, data: []
      },
      {
        name: `4. ${this.quarter}`, data: []
      }
    ];
    const dates = this.getDates(data);
    const years = this.extractYears(data);
    // Count pest occurances per quarter per year
    for (const year of years) {
      const pestPerQuater: number[] = [];
      for (const date of dates) {
        if (year === this.extractYear(date)) {
          pestPerQuater.push(moment(date).quarter());
        }
      }
      const count = _.countBy(pestPerQuater);
      for (const q of ['1', '2', '3', '4']) {
        // Push 0 if no epidemic per quarter
        if (!Object.keys(count).includes(q)) {
          count[q] = 0;
        }
      }
      // Add counts for each year to every quarters data arr
      aggregateEpidemicsPerQuarter.forEach((quarter, i) => {
        quarter.data.push(count[(i + 1).toString()]);
      });
    }
    return aggregateEpidemicsPerQuarter;
  }

  private extractYear(date: string | Date): number {
    return moment(this.checkDate(date)).year();
  }

  private extractYears(data: Report[]) {
    return _.uniq(this.getDates(data).map(date => this.extractYear(date))).sort();
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

}
