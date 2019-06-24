import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Report } from './models/report.model';
import * as moment from 'moment';

@Injectable()
export class SparqlDataService {

  private _api = environment.api;

private _prefix = `
BASE <https://blv.ld.admin.ch/animalpest/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX gont: <https://gont.ch/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX blv-attribute: <http://ld.zazuko.com/animalpest/attribute/>
PREFIX blv-dimension: <http://ld.zazuko.com/animalpest/dimension/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX schema: <http://schema.org/>
`;

  constructor(
    private http: HttpClient,
    ) { }

  // TODO: Create new sparql-report type
  getReports(lang: string, from: string | Date, to: string | Date): Observable<any> {
    const url = 'http://ld.zazuko.com/query';

    const query = `${this._prefix}
    SELECT *
    FROM <https://linked.opendata.swiss/graph/blv/animalpest> WHERE {
    ?sub a qb:Observation ;
        blv-attribute:diagnose_datum ?diagnose_datum ;
        blv-attribute:kanton_id ?canton_id ;
        blv-attribute:kanton_id/rdfs:label ?kanton ;
        blv-attribute:gemeinde_id ?munic_id ;
        blv-attribute:gemeinde_id/rdfs:label ?gemeinde ;
        blv-dimension:tier-art ?tierartUri ;

        blv-dimension:tier-seuche ?seuchen_uri .

    ?tierartUri rdfs:label ?tierart ;
        skos:broader/rdfs:label ?tier_gruppe .

    ?seuchen_uri rdfs:label ?seuche ;
        skos:broader/rdfs:label ?seuchen_gruppe .

    FILTER(langMatches(lang(?tierart), "${lang}"))
    FILTER(langMatches(lang(?seuche), "${lang}"))
    FILTER(langMatches(lang(?seuchen_gruppe), "${lang}"))
    FILTER(langMatches(lang(?tier_gruppe), "${lang}"))
    FILTER (?diagnose_datum >= "${this.checkDate(from)}"^^xsd:date && ?diagnose_datum <="${this.checkDate(to)}"^^xsd:date)
    }`;

    const params = new HttpParams()
      .set('url', url)
      .set('query', query);
    return this.http.get<Report[]>(this._api + 'getData', { params: params });
  }

  getWkt(division): any {
    if (division !== 'ADM1' && division !== 'ADM3') {
      division = 'ADM1';
    }
    // TODO: Maybe reuse if trying to store WKTs in this service. But the service call will have to be done from filter.component.ts
    // const session = sessionStorage.getItem('canton');
    // console.log('i found in session: ', session);
    // if (session) {
    //   return Observable.create(function subscribe(observer) {
    //     console.log('I returned early');
    //     observer.next(session);
    //   });
    // }
    const url = 'https://ld.geo.admin.ch/query';
    const query = `${this._prefix}
SELECT * WHERE {
      {
        SELECT(max(?issued) AS ?mostRecentYear) WHERE {
          <https://ld.geo.admin.ch/boundaries/canton/1> dct:hasVersion/dct:issued ?issued.
        }
      }
	    ?canton <http://www.geonames.org/ontology#featureCode> <http://www.geonames.org/ontology#A.${division}> ;
      <http://purl.org/dc/terms/hasVersion> ?geomuniVersion .
      ?geomuniVersion <http://purl.org/dc/terms/issued> ?mostRecentYear ;
      <http://www.opengis.net/ont/geosparql#hasGeometry>/<http://www.opengis.net/ont/geosparql#asWKT> ?wkt .
      ?geomuniVersion <https://ld.geo.admin.ch/def/bfsNumber> ?shape_id .
    }`;
    const params = new HttpParams()
      .set('url', url)
      .set('query', query);
    return this.http.get<any>(this._api + 'getData', { params: params });
  }

  getMunicForCanton(canton: number): any {
    const url = 'https://ld.geo.admin.ch/query';
    const query = `${this._prefix}
SELECT * WHERE {
  {
    SELECT (max(?issued) AS ?mostRecentYear) WHERE {
    # Most recent year of municipality that is not likely to change (Bern)
		<https://ld.geo.admin.ch/boundaries/municipality/351> dct:hasVersion/dct:issued ?issued.
	}
  }
  	?municipality <http://www.geonames.org/ontology#featureCode> <http://www.geonames.org/ontology#A.ADM3> ;
    <http://purl.org/dc/terms/hasVersion> ?geomuniVersion .

    ?geomuniVersion <http://purl.org/dc/terms/issued> ?mostRecentYear ;
    <http://www.geonames.org/ontology#parentADM1> <https://ld.geo.admin.ch/boundaries/canton/${canton}:2019>  ;
    <http://www.opengis.net/ont/geosparql#hasGeometry>/<http://www.opengis.net/ont/geosparql#asWKT> ?wkt .
    ?geomuniVersion <https://ld.geo.admin.ch/def/bfsNumber> ?shape_id .
  }`;
    const params = new HttpParams()
      .set('url', url)
      .set('query', query);
    return this.http.get<any>(this._api + 'getData', { params: params });
  }

  private checkDate(date: string | Date): string {
    return (moment(date).isValid()) ? moment(date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
  }

}
