import { Component, OnInit, Input } from '@angular/core';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { Chart } from 'angular-highcharts';
import { Report } from '../../../models/report.model';
import * as _ from 'lodash';

@Component({
  selector: 'app-frequency-chart',
  templateUrl: './frequency-chart.component.html',
  styleUrls: ['./frequency-chart.component.css']
})
export class FrequencyChartComponent implements OnInit {

  frequencyChart: Chart;
  ready = false;

  constructor(
    private _distributeDataServie: DistributeDataService
  ) { }

  ngOnInit() {
    this._distributeDataServie.currentData.subscribe(
      data => {
        this.ready = true;
        this.drawChart(data);
      },
      err => console.log(err)
    );
  }

  drawChart(data: Report[]): void {
    this.frequencyChart = new Chart({
      chart: {
        type: 'pie'
      },
      title: {
        text: undefined
      },
      tooltip: {
        pointFormat: '<b>{point.percentage:.1f}%</b>'
      },
      credits: {
        enabled: false
      },
      plotOptions: {
        pie: {
          size: '250px', // 350 Originally
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: false
          },
          colors: this.setColors(),
          showInLegend: true
        }
      },
      responsive: {
        rules: [{
          condition: {
            maxWidth: 400
          }
        }]
      },
      series: [{
        data: this.extractPestCount(data).slice(0, 7) // TODO: Double check. What if less than 7?
      }]
    });
  }

  private setColors() {
    const piecols = [];
    for (let i = 20; i < 160; i += 10) {
      // http://www-db.deis.unibo.it/courses/TW/DOCS/w3schools/colors/colors_picker.asp-colorhex=A52A2A.html
      piecols.push(`hsl(0,59%, ${i}%)`);
    }
    return piecols;
  }

  private extractPestCount(reports: Report[]): object[] {
    const pestCount = [];
    // countBy: count orrurence in array
    // get(obj, pathToValue, defaultValue): check if property exists
    const counts = _.countBy(reports.map(pest => _.get(pest, 'seuche.value', 'undefined')));
    _.mapKeys(counts, (value: string, key: number): void => {
        pestCount.push({
          name: key,
          y: value
        });
    });
    return pestCount;
  }

}
