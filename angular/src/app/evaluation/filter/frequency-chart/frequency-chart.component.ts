import { Component, OnInit, OnDestroy } from '@angular/core';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';
import { Chart } from 'angular-highcharts';
import { Report } from '../../../shared/models/report.model';
import { Translations } from '../../../shared/models/translations.model';
import { Frequency } from '../../../shared/models/frequency.model';
import { get, countBy, mapKeys, uniqBy, orderBy, find } from 'lodash';
import { HighchartService } from 'src/app/shared/highchart.service';
import { NotificationService } from '../../../shared/notification.service';
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
  reports: Report[];
  trans: Translations;
  yLabel: string;
  loaded: boolean;

  constructor(
    public translate: TranslateService,
    private _distributeDataServie: DistributeDataService,
    private _highChartService: HighchartService,
    private _notification: NotificationService,
  ) { }

  ngOnInit() {
    this.dataSub = this._distributeDataServie.currentData.subscribe(
      (data: Report[]) => {
        this.loaded = true; // stop loading sign if any kind of response from the server
        if (data.length > 0) {
          this.reports = data;
          this.translationSub = this.translate.get([
            'EVAL.SHOW_ALL_NONE',
            'EVAL.OTHER',
            'EVAL.EPIDEMIC_PER_ANIMLAL',
            'EVAL.ANIMLAL_PER_EPIDEMIC'
            ]).subscribe(
              texts => {
                this.trans = texts;
                this.drawChart(data, 'epidemic', 'animal_species');
              }
            );
        }
      },
      err => {
        this.loaded = false; // show spin wheel on err
        this._notification.errorMessage(err.statusText + '<br>' + err.message , err.name);
      }
    );
  }

  ngOnDestroy() {
    this.translationSub.unsubscribe();
    this.dataSub.unsubscribe();
  }

  drawChart(data: Report[], barName: string, stackName: string): void {
    if (barName === 'epidemic') {
      this.yLabel = this.trans['EVAL.ANIMLAL_PER_EPIDEMIC'];
    } else {
      this.yLabel = this.trans['EVAL.EPIDEMIC_PER_ANIMLAL'];
    }

    this.frequencyChart = new Chart({
      chart: {
        type: 'column'
      },
      title: {
        text: undefined
      },
      xAxis: {
        categories: this.limitCollection(data, barName).concat([this.trans['EVAL.OTHER']])
      },
      yAxis: {
        min: 0,
        allowDecimals: false,
        title: {
          text: this.yLabel
        },
        stackLabels: {
          enabled: true,
          style: {
            fontWeight: 'bold',
            color: '#999999'
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
      colors: this._highChartService.getColors(),
      plotOptions: {
        column: {
          stacking: 'normal',
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
      series: this.extractFrequencies(data, barName, stackName).concat(
        // add empty series as placeholder to toggle all/none
        {
          name: this.trans['EVAL.SHOW_ALL_NONE'],
          data: [],
          color: '#ffffff' // Hide dot symbol on backgroud
        })
    });
  }

  // toggle all bars in chart
  onPointClick = (event: any): boolean => {
    return this._highChartService.toggleLegend(event);
  }

  // display epidemics per animal species
  onShowEpidemics(): void {
    this.drawChart(this.reports, 'epidemic', 'animal_species');
  }

  // display animal species per epidemic
  onShowAnimals(): void {
    this.drawChart(this.reports, 'animal_species', 'epidemic');
  }

  private countOccurance(target: string, reports: Report[]): Frequency[] {
    let result = [];
    // countBy: count orrurence in array
    // get(obj, pathToValue, defaultValue): check if property exists
    const count = countBy(reports.map(pest => get(pest, target, 'not defined')));
    mapKeys(count, (value: string, key: number): void => {
      result = result.concat({
        name: key,
        y: value
      });
    });
    return result;
  }

  /**
   * Reads from the report collection the frequencies of either `epidemic` per `animal_species` or vice versa.
   * Transforms it  into a fromat required by highcharts.
   *
   * @param {Report[]} reports: list of the current epidemic reports
   * @param {string} barType report property that is going to be displayed as bar
   * @param {string} stackType reorit property that is stacked on different bars
   * @returns {Frequency[]} collection with each object containing the names of the stacks and an array
   * which holds the occurance per bar
   */
  private extractFrequencies(reports: Report[], barType: string, stackType: string): Frequency[] {
    // extract all unique stack types and sort alphabetically
    const uniqueStackNames = uniqBy(reports.map(report => report[stackType])).sort();
    // extract all 7 unique bar types (limit to 6 from above + 'Other')
    const uniqueBarNames = this.limitCollection(reports, barType);
    // create a placeholder for each stack, holding the count per bar in the 'data' array
    const frequencies = uniqueStackNames.map((uniqueStackName: string) => {
      return {
        'name': uniqueStackName,
        'data': new Array(uniqueBarNames.length + 1).fill(0) // Create arr in the length of needed bars plus 1 for  'Other' and init with 0
      } as Frequency;
    });
    reports.forEach(report => {
      const tmpObj = find(frequencies, (o: Frequency) => o.name === report[stackType]);
      const idx = uniqueBarNames.indexOf(report[barType]);
      if (idx < 0) {
        tmpObj.data[6]++;
      } else {
        tmpObj.data[idx]++;
      }
    });
    return frequencies;
  }

  private limitCollection(data: Report[], target: string): string[] {
    const count = this.countOccurance(target, data);
    return orderBy(count, ['y'], 'desc').slice(0, 6).map(e => e.name);
  }

}
