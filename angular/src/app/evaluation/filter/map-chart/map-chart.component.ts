import { Component, OnInit, AfterViewInit } from '@angular/core';
import { SparqlDataService } from '../../../shared/sparql-data.service';
import { Report } from '../../../shared/models/report.model';
import { Subscription, combineLatest, forkJoin } from 'rxjs';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';


import OlMap from 'ol/Map';
import OlXYZ from 'ol/source/XYZ';
import OlTileLayer from 'ol/layer/Tile';
import OlVectorLayer from 'ol/layer/Vector';
import WKT from 'ol/format/WKT';
import OlView from 'ol/View';
import { fromLonLat, transform } from 'ol/proj';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { transformExtent } from 'ol/proj';
import { Fill, Style } from 'ol/style.js';

import olMap from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import OSM from 'ol/source/OSM.js';
import XYZ from 'ol/source/XYZ';
import Vector from 'ol/source/Vector';


@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements OnInit, AfterViewInit {

  height = 600;

  dataSub: Subscription;
  reports: Report[];

  featureData = [];

  map: OlMap;
  source: OlXYZ;
  layer: OlTileLayer;
  view: OlView;

  fill = new Fill();
  style = new Style({
    fill: this.fill,
  });

  shapes = [];

  vectorLayer: any;

  data$: any;
  shapes$: any;
  something$: any;


  constructor(
    private _sparqlDataService: SparqlDataService,
    private _distributeDataService: DistributeDataService,
  ) { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.dataSub = this._distributeDataService.currentData.subscribe(
      data => {
        // Only proceed if data is emitted
        if (data) {
          // load data for canton shapes and simultaniously load for municipalites
          // check if shapes have been loaded into sessions or if already loaded into component
          this._sparqlDataService.getCantonsWkt().subscribe(
            shapes => {
              if (!sessionStorage.getItem('canton')) {
                console.log('I saved to storage: ', shapes);
                // Set a session cache. Stringify because the cache can only handle string key/value pairs
                sessionStorage.setItem('canton', JSON.stringify(shapes));
              }
              console.log('I received ', JSON.parse(shapes));
            },
            // TODO: Handle if no shapes received
            err => console.log(err)
            );




          // this.ready = true;
          this.reports = data;
          // console.log('I got new data');
          const addColor = (feature: any) => {
            // console.log('feature', feature);
            const chance = new Date().getTime() % 2;
            // console.log('chance', chance);
            if (chance > 0) {
              this.fill.setColor('red');
            } else {
              this.fill.setColor('green');
            }
            return this.style;
          }

          if (this.shapes.length > 0) {
            this.vectorLayer.setStyle(addColor);
          }
        }
      }, // TODO: handle if no reports come in
      err => console.log(err)
    );






    const osmLayer = new TileLayer({
      source: new OSM()
    });
    // limit where the user can pan [minx, miny, maxx, maxy]
    const maxExtent = transformExtent([5.888672, 45.644768, 11.030273, 47.975214], 'EPSG:4326', 'EPSG:3857');

    // Generate style for gradient or pattern fill

    const xyzLayer = new TileLayer({
      source: new XYZ({
        url: 'http://tile.osm.org/{z}/{x}/{y}.png'
      })
    });
    const format = new WKT();
    const feature = format.readFeature('POLYGON((10.689697265625 -25.0927734375, 34.595947265625 ' +
      '-20.1708984375, 38.814697265625 -35.6396484375, 13.502197265625 ' +
      '-39.1552734375, 10.689697265625 -25.0927734375))');
    feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');

    const vectorLayer = new OlVectorLayer({
      source: new Vector({
        features: [feature]
      })
    });


    this.view = new View({
      // OL default projection Web Mercator (EPSG:3857). gather coordinat information from https://epsg.io/
      center: fromLonLat([8.349609, 46.867703]),
      zoom: 7.5,
      minZoom: 7,
      extent: maxExtent
    });

    this.map = new olMap({
      target: 'ol-map',
      layers: [
        osmLayer, // TODO: Get swisstopo style layer
        // xyzLayer
        // vectorLayer
      ],
      view: this.view,
    });


  /**
   * IDEE
   * Alle Date WKTS werden ab init remote geladen und dann per Service zur Verfügung gestellt.
   * (Ab APP start müssen die Daten nur einmal geladen werden)
   * Je nach ausgewähltem Tab (Kanton || Gemeinde), werden die entsprechenden Shapes angezeigt.
   * Unter der Karte befindet sich eine Farblegende und eine Anzeige mit Detailinfos
   * (Leer: Klicken sie auf eine Gemeine um Detail Infos zu erhalten)
   * Maybe display name on hover and display info on click. Only make the ones with data clickable. Or dispaly at all
   */


    // this._sparqlDataService.getCantonsWkt().subscribe(
    //   wkts => {
    //     const features = [];
    //     wkts.map(w => {
    //       features.push(
    //         {
    //           // id: w[0].wkt.value.length,
    //           // wkt: w[0].wkt.value,
    //           id: w.canton_id.value,
    //           wkt: w.wkt.value,
    //           canton: true
    //         }
    //       );
    //     });
    //     this.featureData = features;
    //     // console.log(this.featureData);

    //     const format = new WKT();
    //     const feature = format.readFeature(features[18].wkt);
    //     feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
    //     this.shapes.push(feature);
    //     this.vectorLayer = new OlVectorLayer({
    //       source: new Vector({
    //         features: this.shapes
    //       }),
    //       // style: this.addColor()
    //     });
    //     this.map.addLayer(this.vectorLayer);
    //     this.map.on('click', (evt) => {
    //       this.map.forEachFeatureAtPixel(evt.pixel,
    //         function (feature) {
    //           // console.log(feature);
    //         });

    //     });





        // *************************
        // Only update the info, if feature changes
        // this.map.on('pointermove', (evt) => {
        //   this.map.forEachFeatureAtPixel(evt.pixel,
        //     function (feature) {
        //       console.log(feature);
        //     });
        // });

        // When mouse leaves the map
        // this.map.getViewport().addEventListener('mouseout', (evt) => {
        //   this.map.forEachFeatureAtPixel(evt.pixel,
        //     function (feature) {
        //       console.log(feature);
        //     });
        // });
        // *************************





    //   },
    //   err => console.log(err)
    // );

    // this._sparqlDataService.getMunicForCanton(1).subscribe(
    //   wkts => {
    //     const features = [];
    //     wkts.map(w => {
    //       // TODO: add dynamic `belongsTo`
    //       features.push({
    //         id: w.munic_id.value,
    //         wkt: w.wkt.value,
    //         belongsTo: 1,
    //         canton: false
    //       });
    //     });
    //     this.featureData = features;
    //     console.log(wkts);

    //   },
    //   err => console.log(err)
    // );
  }

  // addColor(feature: any) {
  //   const chance = new Date().getTime() % 2;
  //   console.log('chance', chance);
  //   if (chance > 0 ) {
  //     this.fill.setColor('red');
  //   } else {
  //     this.fill.setColor('green');
  //   }
  //   return this.style;
  // }

  onChance() {
    console.log('chance');
    this.vectorLayer.source.refresh();
  }

  private sumEpidemicsPerCanton(reports: Report[], cantonId: number): number {
    return reports.filter(report => report.canton_id === cantonId).length;
  }

  private sumAllEpidemics(reports: Report[]): number {
    return reports.length;
  }

  private getRelativeColor(percent: number): any {
    return `hsl(0, 59%, ${(percent).toFixed()}%)`;
  }

}
