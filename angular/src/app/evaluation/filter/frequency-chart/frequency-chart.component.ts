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
  reports: Report[];

  constructor(
    private _distributeDataServie: DistributeDataService
  ) { }

  ngOnInit() {
    this._distributeDataServie.currentData.subscribe(
      data => {
        this.ready = true;
        this.pestTypes = _.uniqBy(data.map(d => d.seuche.value)).sort();
        this.animalTypes = _.uniqBy(data.map(d => d.tierart.value)).sort();
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
    const categories = this.limitCollection(filterTarget, data);
    categories.push('Other');
    this.frequencyChart = new Chart({
      chart: {
        type: 'column'
      },
      title: {
        text: undefined
      },
      xAxis: {
        categories: categories
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
      series: filterFn(data)
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

  private countOccurance(target: string, reports: Report[]): { name: string, y: number }[] {
    const count = [];
    // countBy: count orrurence in array
    // get(obj, pathToValue, defaultValue): check if property exists
    const counts = _.countBy(reports.map(pest => _.get(pest, `${target}.value`, 'undefined')));
    _.mapKeys(counts, (value: string, key: number): void => {
      count.push({
        name: key,
        y: value
      });
    });
    return count;
  }

  extractPestFrequencies = (reports: any) => {
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
    const animalTypes = _.uniqBy(animals.map(a => a.tierart)).sort();
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
  }


  extractAnimalFrequencies = (reports: any) => {
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
    const animalTypes = this.limitCollection('tierart', reports);
    animalTypes.push('Other');
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

  private limitCollection(target: string, data: any) {
    const count = this.countOccurance(target, data);
    return _.orderBy(count, ['y'], 'desc').slice(0, 6).map(e => e.name);
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
