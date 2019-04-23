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
    this._distributeDataServie.currentData.subscribe(
      data => {
        this.ready = true;
        this.reports = data;
        this.drawChart(data, 'epidemic', this.extractPestFrequencies);
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
    const result = [];
    // countBy: count orrurence in array
    // get(obj, pathToValue, defaultValue): check if property exists
    const count = countBy(reports.map(pest => get(pest, `${target}`, 'undefined')));
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
      if (this.limitCollection('epidemic', reports).includes(r.epidemic)) {
        return {
          animal_species: r.animal_species,
          epidemic: r.epidemic,
        };
      } else {
        return {
          animal_species: r.animal_species,
          epidemic: 'Other',
        };
      }
    });
    const animalTypes = uniqBy(animals.map(a => a.animal_species)).sort();
    // this.animalTypes = animalTypes;
    const pestTypes = this.limitCollection('epidemic', reports);
    pestTypes.push('Other');
    // const pestTypes = _.uniqBy(animals.map(p => p.seuche)).sort();
    const pestPerAnimal = [];
    animalTypes.forEach((at: string) => {
      const seuchen = [];
      animals.forEach(a => {
        if (at === a.animal_species) {
          seuchen.push(a.epidemic);
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
      if (this.limitCollection('animal_species', reports).includes(r.animal_species)) {
        return {
          animal_species: r.animal_species,
          epidemic: r.epidemic,
        };
      } else {
        return {
          animal_species: 'Other',
          epidemic: r.epidemic,
        };
      }

    });
    // const animalTypes = _.uniqBy(animals.map(a => a.tierart)).sort();
    // this.animalTypes = animalTypes;
    const animalTypes = this.limitCollection('animal_species', reports).concat(['Other']);
    // animalTypes.push('Other');

    const pestTypes = uniqBy(animals.map(p => p.epidemic)).sort();
    const pestPerAnimal = [];
    animalTypes.forEach((at: string) => {
      const seuchen = [];
      animals.forEach(a => {
        if (at === a.animal_species) {
          seuchen.push(a.epidemic);
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

  onShowEpidemics(): void {
    if (this.reports) {
      this.drawChart(this.reports, 'epidemic', this.extractPestFrequencies);
    }
  }

  onShowAnimals(): void {
    if (this.reports) {
      this.drawChart(this.reports, 'animal_species', this.extractAnimalFrequencies);
    }
  }

}
