import { Component, AfterViewInit } from '@angular/core';
import { SparqlDataService } from '../../../shared/sparql-data.service';
import { Report } from '../../../shared/models/report.model';
import { Subscription } from 'rxjs';
import { DistributeDataService } from 'src/app/shared/distribute-data.service';

import OlMap from 'ol/Map';
import OlXYZ from 'ol/source/XYZ';
import OlTileLayer from 'ol/layer/Tile';
import OlVectorLayer from 'ol/layer/Vector';
import Select from 'ol/interaction/Select.js';
import { click, pointerMove } from 'ol/events/condition.js';
import { defaults as defaultControls, Attribution } from 'ol/control.js';
import WKT from 'ol/format/WKT';
import OlView from 'ol/View';
import { fromLonLat } from 'ol/proj';
import { transformExtent } from 'ol/proj';
import { Fill, Style, Stroke } from 'ol/style.js';

import olMap from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import OSM from 'ol/source/OSM.js';
import Vector from 'ol/source/Vector';

import { isEqual } from 'lodash';


@Component({
  selector: 'app-map-chart',
  templateUrl: './map-chart.component.html',
  styleUrls: ['./map-chart.component.css']
})
export class MapChartComponent implements AfterViewInit {

  height = 600;

  dataSub: Subscription;
  reports: Report[];

  map: OlMap;
  source: OlXYZ;
  layer: OlTileLayer;
  view: OlView;

  // base style for all shapes
  fill = new Fill();
  style = new Style({
    fill: this.fill,
    stroke: new Stroke({
      color: '#333',
      width: 1
    })
  });
  opacity = 0.6;

  selectStyle = new Style({
    fill: this.fill,
    stroke: new Stroke({
      color: 'yellow',
      width: 4
    })
  });


  // select interaction working on "pointermove"
  select = new Select({
    condition: pointerMove,
    style: this.selectStyle
  });

  attribution = new Attribution({
    collapsible: true
  });

  cantonVectorLayer: OlVectorLayer;
  municVectorLayer: OlVectorLayer;
  currentLayer: OlVectorLayer;

  // Temp
  area;

  constructor(
    private _sparqlDataService: SparqlDataService,
    private _distributeDataService: DistributeDataService,
  ) { }

  /**
  * IDEA:
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
            this.updateLayer(this.currentLayer);
          }

        }
        // only get canton shapes if none exist
        if (!this.cantonVectorLayer) {
        // load data for canton shapes and simultaniously load for municipalites
        this._sparqlDataService.getCantonsWkt().subscribe(
            // TODO: use RXJS pipe/map
            cantonWkts => {
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
               * - Add lazy loading for small bundle
               // check if shapes have been loaded into sessions or if already loaded into component
              if (!sessionStorage.getItem('canton')) {
                console.log('I saved to storage: ', shapes);
                // Set a session cache. Stringify because the cache can only handle string key/value pairs
                sessionStorage.setItem('canton', JSON.stringify(shapes));
              }
              */

              this.cantonVectorLayer = new OlVectorLayer({
                source: new Vector({
                  features: this.createShapes(cantonWkts, true)
                }),
                opacity: this.opacity
              });
              // First time a layer is initialized it is set to `currentLayer`
              this.currentLayer = this.cantonVectorLayer;
              console.log('This function should only be called once');
              // Add cantons as initial layer
              this.map.addLayer(this.cantonVectorLayer);
              this.map.addInteraction(this.select);
              this.select.on('select', event => { // TODO: Add click event that will freeze the selection
                if (event.selected.length > 0) {
                  this.area = event.selected[0].getId();
                }
              });

              this.updateLayer(this.cantonVectorLayer);
            },
            // TODO: Handle if no canton shapes received
            err => console.log(err)
          );
          }

          // only get munic shapes if none exist
          if (!this.municVectorLayer) {
            this._sparqlDataService.getMunicForCanton(2).subscribe(
              municWkts => {
                this.municVectorLayer = new OlVectorLayer({
                  source: new Vector({
                    features: this.createShapes(municWkts, false)
                  }),
                  opacity: this.opacity
                });
              },
              // TODO: handle if no munic shapes come in
              err => console.log(err)
            );
          }




      }, // TODO: handle if no reports come in
      err => console.log(err)
    );







    // NOTE: Was in "new WKT()" etc.
        // *************************

        // *************************


  }

  onSwitchLayer(layer: OlVectorLayer): void {
    this.map.removeLayer(this.currentLayer);
    this.currentLayer = layer;
    this.map.addLayer(this.currentLayer);
    this.updateLayer(this.currentLayer);
  }

  private updateLayer(layer: OlVectorLayer) {
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

    if (this.cantonVectorLayer || this.municVectorLayer) {
      layer.setStyle(addColor);
    }
  }

  private initMap() {
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
      controls: defaultControls({ attribution: false }).extend([this.attribution])
    });

  }


  // transform format to WKT and in the right projection
  private createShapes(features: any[], isCanton: boolean): Vector[] { // TODO: type
    const format = new WKT();
    return features.map(f => {
      const feature = format.readFeature(f.wkt.value);
      feature.getGeometry().transform('EPSG:4326', 'EPSG:3857');
      feature.setId(Number(f.shape_id.value));
      feature.setProperties({
        'name': f.shape_id.value, // TODO: Replace by actual name
        'isCanton': isCanton,
      });
      // TODO: If munic, add a belongs to value
      // feature.set('belongsTo', cantonId); e
      // feature.get('name'); // Get the set values
      return feature;
    });
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
