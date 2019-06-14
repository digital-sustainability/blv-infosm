import { Component, OnInit, AfterViewInit } from '@angular/core';
import { SparqlDataService } from '../../../shared/sparql-data.service';
import { Report } from '../../../shared/models/report.model';
import { Subscription } from 'rxjs';
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

import { isEqual } from 'lodash';


@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements OnInit, AfterViewInit {

  height = 600;

  dataSub: Subscription;
  reports: Report[];

  map: OlMap;
  source: OlXYZ;
  layer: OlTileLayer;
  view: OlView;

  fill = new Fill();
  style = new Style({
    fill: this.fill,
  });

  cantonShapes = [];
  municShapes = [];

  cantonVectorLayer: any;
  municVectorLayer: any;


  constructor(
    private _sparqlDataService: SparqlDataService,
    private _distributeDataService: DistributeDataService,
  ) { }

  ngOnInit(): void { }

  initMap() {
    const osmLayer = new TileLayer({
      source: new OSM()
    });
    // limit where the user can pan [minx, miny, maxx, maxy]
    const maxExtent = transformExtent([5.888672, 45.644768, 11.030273, 47.975214], 'EPSG:4326', 'EPSG:3857');

    this.view = new View({
      // OL default projection Web Mercator (EPSG:3857). gather coordinat information from https://epsg.io/
      center: fromLonLat([8.349609, 46.867703]),
      zoom: 7.5,
      minZoom: 7,
      extent: maxExtent
    });

    this.map = new olMap({
      target: 'ol-map',
      layers: [osmLayer], // TODO: Get swisstopo style layer
      view: this.view,
    });

  }

  updateLayers() {
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
    };

    if (this.cantonShapes.length > 0) {
      this.cantonVectorLayer.setStyle(addColor);
    }
  }


  /**
  * IDEE
  * Je nach ausgewähltem Tab (Kanton || Gemeinde), werden die entsprechenden Shapes angezeigt.
  * Unter der Karte befindet sich eine Farblegende und eine Anzeige mit Detailinfos
  * (Leer: Klicken sie auf eine Gemeine um Detail Infos zu erhalten)
  * Maybe display name on hover and display info on click. Only make the ones with data clickable. Or dispaly at all
  */
  ngAfterViewInit(): void {
    this.initMap();
    this.dataSub = this._distributeDataService.currentData.subscribe(
      data => {
        // Only proceed if data is emitted or data has changed (deep comparison)
        if (data.length && !isEqual(this.reports, data)) {
          this.reports = data;
          // Only call when shapes are loaded or reports have changed
          if (this.cantonVectorLayer) {
            this.updateLayers();
          }

        }
        // only get canton shapes if none exist
        if (!this.cantonVectorLayer) {
        // load data for canton shapes and simultaniously load for municipalites
        this._sparqlDataService.getCantonsWkt().subscribe(
            // TODO: use RXJS pipe/map
            wkts => {
              /**
               * TODO: Cache is too big to be kept in session-/loaclStorage. It can still be tried for the data loaded by the filter
               * but has to be implemented with an exeption handler in case the cache exeeds the browsers maxium. It might still be
               * helpful though, depends if the distribute service is sufficient in chaing for the whole filter
               *
               * MORE PERFORMANCE IDEAS:
               * - Cache the WKTs in one of the filters service, to minimize refetching
               * - Cache the WKTs in our backend so it does not have to be refetched from LINDAS too often
               * - Cache the "fetch-all" query daily in the backend so speed up this request
               * - Memoize heavy functions
               // check if shapes have been loaded into sessions or if already loaded into component
              if (!sessionStorage.getItem('canton')) {
                console.log('I saved to storage: ', shapes);
                // Set a session cache. Stringify because the cache can only handle string key/value pairs
                sessionStorage.setItem('canton', JSON.stringify(shapes));
              }
              console.log('I received ', JSON.parse(cantonShapes));
              */

            const features = [];
            wkts.map(w => {
              features.push(
                {
                  id: w.canton_id.value,
                  wkt: w.wkt.value,
                  canton: true
                }
              );
            });


            // TODO: Add for-loop for all shapes
            // TODO: Extract to own method and usable for munic as well
            const format = new WKT();
            features.forEach(f => {
              const feature = format.readFeature(f.wkt);
              feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
              this.cantonShapes.push(feature);
            });
            // const feature = format.readFeature(features[18].wkt);
            // feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
            // this.cantonShapes.push(feature);
            this.cantonVectorLayer = new OlVectorLayer({
              source: new Vector({
                features: this.cantonShapes
              })
            });
            console.warn('This function should only be called once');
            this.map.addLayer(this.cantonVectorLayer); // TODO: Remove layer when switching to munic
        // this.map.on('click', (evt) => {
        //   this.map.forEachFeatureAtPixel(evt.pixel,
        //     function (feature) {
        //       // console.log(feature);
        //     });
        // });


              this.updateLayers();
            },
            // TODO: I only want you called on first load
            // TODO: Handle if no canton shapes received
            err => console.log(err)
          );
          }

          // only get munic shapes if none exist
          // if (!this.municVectorLayer) {
          //   this._sparqlDataService.getCantonsWkt().subscribe(
          //     municShapes => console.log(municShapes),
          //     // TODO: handle if no munic shapes come in
          //     err => console.log(err)
          //   );
          // }




      }, // TODO: handle if no reports come in
      err => console.log(err)
    );









    // const xyzLayer = new TileLayer({
    //   source: new XYZ({
    //     url: 'http://tile.osm.org/{z}/{x}/{y}.png'
    //   })
    // });
    // const format = new WKT();
    // const feature = format.readFeature('POLYGON((10.689697265625 -25.0927734375, 34.595947265625 ' +
    //   '-20.1708984375, 38.814697265625 -35.6396484375, 13.502197265625 ' +
    //   '-39.1552734375, 10.689697265625 -25.0927734375))');
    // feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');

    // const vectorLayer = new OlVectorLayer({
    //   source: new Vector({
    //     features: [feature]
    //   })
    // });








    // NOTE: Was in "new WKT()" etc.
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

  addColor(feature: any) {
    const chance = new Date().getTime() % 2;
    console.log('chance', chance);
    if (chance > 0 ) {
      this.fill.setColor('red');
    } else {
      this.fill.setColor('green');
    }
    return this.style;
  }

  onChance() {
    console.log('chance');
    this.cantonVectorLayer.source.refresh();
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
