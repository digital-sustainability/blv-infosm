import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HighchartService {

  constructor() { }

  allVisible = true;

  toggleLegend(event: any): boolean {
    const lines = event.target.chart.series;
    // show all lines in case respective legend item (which contains no data) is clicked
    if (event.target.data.length === 0) {
      lines.forEach(line => {
        this.allVisible ? line.hide() : line.show();
      });
      // toggle legend state
      this.allVisible = !this.allVisible;
      // cancle the default action of the legend by returning false
      return false;
    }
  }

  getColors(): string[] {
    return [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6',
    '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3',
    '#808000', '#ffd8b1', '#000075', '#808080', '#a9a9a9', '#000000'];
  }
}
