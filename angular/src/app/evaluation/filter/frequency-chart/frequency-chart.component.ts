import { Component, OnInit, OnDestroy } from '@angular/core';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { Chart } from 'angular-highcharts';
import { Report } from '../../../shared/models/report.model';
import { Frequency } from '../../../shared/models/frequency.model';
import { get, countBy, mapKeys, uniqBy, orderBy } from 'lodash';
import { HighchartService } from 'src/app/shared/highchart.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-frequency-chart',
  templateUrl: './frequency-chart.component.html',
  styleUrls: ['./frequency-chart.component.css']
})
export class FrequencyChartComponent implements OnInit, OnDestroy {

  dataSub: Subscription;
  translationSub: Subscription;
  frequencyChart: Chart;
  ready = false;
  reports: Report[];
  allLinesLabel: string;

  constructor(
    public translate: TranslateService,
    private _distributeDataServie: DistributeDataService,
    private _highChartService: HighchartService,
  ) { }

  // TODO: Enforce typing
  ngOnInit() {
    console.log(this.range(5, 19));
    this.dataSub = this._distributeDataServie.currentData.subscribe(
      data => {
        if (data) {
          this.ready = true;
          this.reports = data;
          this.translationSub = this.translate.get(['EVAL.SHOW_ALL_NONE'])
            .subscribe(
              texts => {
                this.allLinesLabel = texts['EVAL.SHOW_ALL_NONE'];
                this.drawChart(data, 'epidemic', this.extractPestFrequencies);
              }
            );
        }
      },
      err => console.log(err)
    );
  }

  ngOnDestroy() {
    this.translationSub.unsubscribe();
    this.dataSub.unsubscribe();
  }

  drawChart(data: Report[], filterTarget: string, filterFn: (d: Report[]) => Frequency[]): void {
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
        allowDecimals: false,
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
      legend: {
        itemWidth: 200,
        itemHoverStyle: {
          color: '#999999',
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
      colors: this._highChartService.getColors(),
      plotOptions: {
        column: {
          stacking: 'normal',
          // dataLabels: {
          //   enabled: true,
          // },
          events: {
            /**
             * Toggle all legend items via service.
             * Use a service because the function needs both access to
             * class scope and highchart scope of `this`
             */
            legendItemClick: this.onPointClick
          }
        }
      },
      series: filterFn(data)
        .concat({
          name: this.allLinesLabel,
          data: [],
          // TODO: Change marker
        })
    });
  }

  onPointClick = (event: any): boolean => {
    return this._highChartService.toggleLegend(event);
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

  private extractPestFrequencies = (reports: any): Frequency[] => {
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
    const pestTypes = this.extractUniqueType(reports, 'epidemic');
    // TODO: From here merge all with method below
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
    return result;
  }


  private extractAnimalFrequencies = (reports: any): Frequency[] => {
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
    const animalTypes = this.extractUniqueType(reports, 'animal_species');
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
    pestTypes.forEach((pestType: string) => {
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
    // console.log('frequency', result)
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
