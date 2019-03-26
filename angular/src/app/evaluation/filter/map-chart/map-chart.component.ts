import { Component, OnInit, AfterContentInit, ViewChild, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import ch from './shared/ch.json';
import sm from './shared/sm.json';
// import * as t from 'ts-topojson';
import * as topojson from 'topojson';

@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements OnInit, AfterContentInit {

  @ViewChild('graphContainer') graphContainer: ElementRef;

  // width = 960;
  height = 400;
  colors = d3.scaleOrdinal(d3.schemeCategory10);

  // radius = '5px';
  geojson = sm;
  topojson = ch;
  lakes = topojson.feature(this.topojson, this.topojson.objects.lakes);
  // lakes = ch.objects.lakes;
  munic = ch.objects.municipalities;
  cantons = ch.objects.cantons;
  path: any;
  colorScale: any;
  svg: any;

  pathMunic: any;

  constructor(
  ) { }


  ngOnInit() {
  }

  ngAfterContentInit() {
    // const svg = this.graphContainer.nativeElement.getBoundingClientRect();
    // // this.colorScale = d3.scaleThreshold()
    // //   .domain([35000, 45000, 55000, 65000, 75000, 85000])
    // //   .range(d3.schemeYlGnBu[7]);

    const svg = d3.select('#graphContainer')
      // .attr('oncontextmenu', 'return false;')
      .attr('height', this.height)
    //   // .attr('transform', 'translate(-200,0) scale(1)')


    // this.drawSvg();
    let path = d3.geoPath().projection(d3.geoMercator());
    let g = svg.append('g');
    g.attr('class', 'map');


    g.selectAll('path')
      // .data(this.geojson.geometries)
      .data(this.lakes.geometries)
      .enter()
      .append('path')
      .attr('d', path)
    // this.svg.append('svg:defs').append('svg:marker')
    //   .attr('id', 'end-arrow')
    //   .attr('viewBox', '0 -5 10 10')
    //   .attr('refX', 6)
    //   .attr('markerWidth', 3)
    //   .attr('markerHeight', 3)
    //   .attr('orient', 'auto')
    //   .append('svg:path')
    //   .attr('d', 'M0,-5L10,0L0,5')
    //   .attr('fill', '#000');

    // // this.path = this.svg.append('svg:g').selectAll('path');
    // this.pathMunic = this.svg.append('svg:g').selectAll('path.munic');

    console.log(this.lakes);

    // this.drawCantons({}, this.svg, this.pathMunic, this.munic.features);

  }

  drawCantons(data, svg, path, cantons) {
    return svg.selectAll('path').data(cantons).enter()
      .append('path')
      .attr('class', 'canton')
      .attr('d', path)
      .style('stroke', 'red')
      .style('fill', 'none')
      .attr('stroke-width', 0.9);
  }

  clicked(event: any) {
    d3.select(event.target)
      .append('circle')
      .attr('cx', event.x)
      .attr('cy', event.y)
      .attr('r', 10)
      .attr('fill', 'red');
  }

  drawSvg(): any {
    return d3.select('svg')
      .append('g')
      .attr('height', '560')
      .attr('width', '560')
      .attr('class', 'outer_g')
      .attr('transform', 'translate(-200,0) scale(1)')
      .append('g');
  }

}
