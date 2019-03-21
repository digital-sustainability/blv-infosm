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
  animalTypes: string[];
  pestTypes: string[];
  ready = false;

  constructor(
    private _distributeDataServie: DistributeDataService
  ) { }

  ngOnInit() {
    this._distributeDataServie.currentData.subscribe(
      data => {
        this.ready = true;
        this.pestTypes = _.uniqBy(data.map(d => d.seuche.value)).sort();
        this.animalTypes = _.uniqBy(data.map(d => d.tierart.value)).sort();
        this.drawChart(data);
      },
      err => console.log(err)
    );
  }

  drawChart(data: Report[]): void {
    console.log('PestCount', this.extractPestCount(data));
    this.frequencyChart = new Chart({
      chart: {
        type: 'column'
      },
      title: {
        text: undefined
      },
      xAxis: {
        categories: this.pestTypes
      },
      yAxis: {
        min: 0,
        title: {
          text: 'Seuchen Pro Tierart'
        },
        stackLabels: {
          enabled: true,
          style: {
            fontWeight: 'bold',
            color: 'gray'
          }
        }
      },
      credits: {
        enabled: false
      },
      // tooltip: {
      //   formatter: function () {
      //     return '<b>' + this.x + '</b><br/>' +
      //       this.series.name + ': ' + this.y + '<br/>' +
      //       'Total: ' + this.point.stackTotal;
      //   }
      // },
      plotOptions: {
        column: {
          stacking: 'normal',
          // dataLabels: {
          //   enabled: true,
          // }
        }
      },
      series: this.extractFrequencyData(data)
      // series: [{
      //   name: 'John',
      //   data: [5, 3, 4, 7, 2]
      // }, {
      //   name: 'Jane',
      //   data: [2, 2, 3, 2, 1]
      // }, {
      //   name: 'Joe',
      //   data: [3, 4, 4, 2, 5]
      // }]
    });
    // this.frequencyChart = new Chart({
    //   chart: {
    //     type: 'pie'
    //   },
    //   title: {
    //     text: undefined
    //   },
    //   tooltip: {
    //     pointFormat: '<b>{point.percentage:.1f}%</b>'
    //   },
    //   credits: {
    //     enabled: false
    //   },
    //   plotOptions: {
    //     pie: {
    //       size: '250px', // 350 Originally
    //       allowPointSelect: true,
    //       cursor: 'pointer',
    //       dataLabels: {
    //         enabled: false
    //       },
    //       colors: this.setColors(),
    //       showInLegend: true
    //     }
    //   },
    //   responsive: {
    //     rules: [{
    //       condition: {
    //         maxWidth: 400
    //       }
    //     }]
    //   },
    //   series: [{
    //     data: this.extractPestCount(data).slice(0, 7) // TODO: Double check. What if less than 7?
    //   }]
    // });
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

  private extractFrequencyData(reports: any) {
    const animals = reports.map(r => {
      return {
        tierart: r.tierart.value,
        seuche: r.seuche.value,
      };
    });
    const animalTypes = _.uniqBy(animals.map(a => a.tierart)).sort();
    this.animalTypes = animalTypes;
    const pestTypes = _.uniqBy(animals.map(p => p.seuche)).sort();
    const pestPerAnimal = [];
    animalTypes.forEach((at: string) => {
      const seuchen = [];
      animals.forEach(a => {
        if (at === a.tierart) {
          seuchen.push(a.seuche);
        }
      });
      const tmp = _.countBy(seuchen);
      tmp.name = at;
      pestPerAnimal.push(tmp);
    });
    const result = [];
    pestPerAnimal.forEach(ppa => {
      const data =[];
      pestTypes.forEach((pt: string) => {
        if (ppa.hasOwnProperty(pt)) {
          data.push(ppa[pt]);
        } else {
          data.push(0);
        }
      });
      result.push({
        name: ppa.name,
        data: data
      });
    });
    console.log('Here', result);
    return result;
  
    // const animals = reports.map(r => {
    //   return {
    //     tierart: r.tierart.value,
    //     seuche: r.seuche.value,
    //   };
    // });
    // const animalTypes = _.uniqBy(animals.map(a => a.tierart)).sort();
    // this.animalTypes = animalTypes;
    // const pestTypes = _.uniqBy(animals.map(p => p.seuche)).sort();
    // const pestPerAnimal = [];
    // animalTypes.forEach((at: string) => {
    //   const seuchen = [];
    //   animals.forEach(a => {
    //     if (at === a.tierart) {
    //       seuchen.push(a.seuche);
    //     }
    //   });
    //   const tmp = _.countBy(seuchen);
    //   tmp.name = at;
    //   pestPerAnimal.push(tmp);
    // });
    // const result = [];
    // pestTypes.forEach(pestType => {
    //   const data =[];
    //   pestPerAnimal.forEach((pestpA: string) => {
    //     if (pestpA.hasOwnProperty(pestType)) {
    //       data.push(pestpA[pestType]);
    //     } else {
    //       data.push(0);
    //     }
    //   });
    //   result.push({
    //     name: pestType,
    //     data: data
    //   });
    // });
    // console.log('Here', result);
    // return result;
  }

}
