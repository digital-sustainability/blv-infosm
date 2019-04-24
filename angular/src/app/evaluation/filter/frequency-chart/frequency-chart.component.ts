import { Component, OnInit } from '@angular/core';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { Chart } from 'angular-highcharts';
import { Report } from '../../../models/report.model';
import { get, countBy, mapKeys, uniqBy, orderBy } from 'lodash';

@Component({
  selector: 'app-frequency-chart',
  templateUrl: './frequency-chart.component.html',
  styleUrls: ['./frequency-chart.component.css']
})
export class FrequencyChartComponent implements OnInit {

  frequencyChart: Chart;
  ready = false;
  reports: Report[];

  constructor(
    private _distributeDataServie: DistributeDataService
  ) { }


  // TODO: Enforce typing
  ngOnInit() {
    console.log(this.range(5, 19));
    this._distributeDataServie.currentData.subscribe(
      data => {
        this.ready = true;
        this.reports = data;
        this.drawChart(data, 'seuche', this.extractPestFrequencies);
      },
      err => console.log(err)
    );
  }

  drawChart(data: Report[], filterTarget: string, filterFn): void {
    // console.log('PestCount', this.countOccurance('seuche', data));
    // console.log('AnimalCount', this.countOccurance(filterTarget, data));
    // console.log('FirstSix', this.limitCollection('seuche', data));

    // const categories = this.limitCollection(filterTarget, data);
    // categories.push('Other');
    this.frequencyChart = new Chart({
      chart: {
        type: 'column'
      },
      title: {
        text: undefined
      },
      xAxis: {
        categories: this.limitCollection(filterTarget, data).concat(['Other'])
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
      colors: [95, 85, 70, 60, 45, 35, 25].map(x => `hsl(30, 100%, ${x}%)`)
        .concat([95, 85, 70, 60, 45, 35, 25].map(x => `hsl(0, 100%, ${x}%)`))
        .concat([95, 85, 70, 60, 45, 35, 25].map(x => `hsl(300, 100%, ${x}%)`)),
      plotOptions: {
        column: {
          stacking: 'normal',
          // dataLabels: {
          //   enabled: true,
          // }
        }
      },
      series: filterFn(data)
    });
  }

  private countOccurance(target: string, reports: Report[]): { name: string, y: number }[] {
    const result = [];
    // countBy: count orrurence in array
    // get(obj, pathToValue, defaultValue): check if property exists
    const count = countBy(reports.map(pest => get(pest, `${target}.value`, 'undefined')));
    mapKeys(count, (value: string, key: number): void => {
      result.push({
        name: key,
        y: value
      });
    });
    return result;
  }

  // TODO: Merge with method below
  private extractPestFrequencies = (reports: any): { name: string, y: number }[] => {
    const animals = reports.map(r => {
      if (this.limitCollection('seuche', reports).includes(r.seuche.value)) {
        return {
          tierart: r.tierart.value,
          seuche: r.seuche.value,
        };
      } else {
        return {
          tierart: r.tierart.value,
          seuche: 'Other',
        };
      }
    });
    const animalTypes = uniqBy(animals.map(a => a.tierart)).sort();
    // this.animalTypes = animalTypes;
    const pestTypes = this.limitCollection('seuche', reports);
    pestTypes.push('Other');
    // const pestTypes = _.uniqBy(animals.map(p => p.seuche)).sort();
    const pestPerAnimal = [];
    animalTypes.forEach((at: string) => {
      const seuchen = [];
      animals.forEach(a => {
        if (at === a.tierart) {
          seuchen.push(a.seuche);
        }
      });
      const tmp = countBy(seuchen);
      tmp.name = at;
      pestPerAnimal.push(tmp);
    });
    const result = [];
    pestPerAnimal.forEach(ppa => {
      const data = [];
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
  }


  private extractAnimalFrequencies = (reports: any): { name: string, y: number }[] => {
    const animals = reports.map(r => {
      if (this.limitCollection('tierart', reports).includes(r.tierart.value)) {
        return {
          tierart: r.tierart.value,
          seuche: r.seuche.value,
        };
      } else {
        return {
          tierart: 'Other',
          seuche: r.seuche.value,
        };
      }

    });
    // const animalTypes = _.uniqBy(animals.map(a => a.tierart)).sort();
    // this.animalTypes = animalTypes;
    const animalTypes = this.limitCollection('tierart', reports).concat(['Other']);
    // animalTypes.push('Other');

    const pestTypes = uniqBy(animals.map(p => p.seuche)).sort();
    const pestPerAnimal = [];
    animalTypes.forEach((at: string) => {
      const seuchen = [];
      animals.forEach(a => {
        if (at === a.tierart) {
          seuchen.push(a.seuche);
        }
      });
      const tmp = countBy(seuchen);
      tmp.name = at;
      pestPerAnimal.push(tmp);
    });
    const result = [];
    pestTypes.forEach(pestType => {
      const data = [];
      pestPerAnimal.forEach((pestpA: string) => {
        if (pestpA.hasOwnProperty(pestType)) {
          data.push(pestpA[pestType]);
        } else {
          data.push(0);
        }
      });
      result.push({
        name: pestType,
        data: data
      });
    });
    console.log('Here', result);
    return result;
  }

  private limitCollection(target: string, data: Report[]) {
    const count = this.countOccurance(target, data);
    return orderBy(count, ['y'], 'desc').slice(0, 6).map(e => e.name);
  }

  private range(count: number, step: number): number[] {
    return Array(count).fill(step).map((x, i) => x + i * step);
  }

  onShowEpidemics(): void {
    if (this.reports) {
      this.drawChart(this.reports, 'seuche', this.extractPestFrequencies);
    }
  }

  onShowAnimals(): void {
    if (this.reports) {
      this.drawChart(this.reports, 'tierart', this.extractAnimalFrequencies);
    }
  }

}
