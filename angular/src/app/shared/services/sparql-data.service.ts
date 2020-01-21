import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Report } from '../models/report.model';
import dayjs from 'dayjs';

@Injectable()
export class SparqlDataService {

private _api = environment.api;
private _zazukoEndpoint = 'https://trifid-lindas.test.cluster.ldbar.ch/query';
private _geoadminEndpoint = 'https://ld.geo.admin.ch/query';

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
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX schema: <http://schema.org/>
`;

  constructor(
    private http: HttpClient,
    ) { }

  getReports(
    by: 'diagnose_datum' | 'publikations_datum',
    lang: string,
    from: string | Date,
    to: string | Date,
    useCaching = false): Observable<any> {
    const query = `${this._prefix}
    SELECT *
    FROM <https://linked.opendata.swiss/graph/blv/animalpest> WHERE {
    ?sub a qb:Observation ;
    blv-attribute:diagnose-date ?diagnose_datum ;
    blv-attribute:release-internet ?publikations_datum ;
    blv-attribute:canton/dcterms:identifier ?canton_id ;
    blv-attribute:canton/rdfs:label ?kanton ;
    blv-attribute:municipality/dcterms:identifier ?munic_id ;
    blv-attribute:municipality/rdfs:label ?gemeinde ;
    blv-dimension:species ?tierartUri ;
    blv-dimension:animaldisease ?seuchen_uri .
    #
    ?tierartUri rdfs:label ?tierart ;
    skos:broader/rdfs:label ?tier_gruppe .
    #
    ?seuchen_uri rdfs:label ?seuche ;
    skos:broader/rdfs:label ?seuchen_gruppe .

FILTER(langMatches(lang(?tierart), "${lang}"))
FILTER(langMatches(lang(?seuche), "${lang}"))
FILTER(langMatches(lang(?seuchen_gruppe), "${lang}"))
FILTER(langMatches(lang(?tier_gruppe), "${lang}"))
FILTER (?${by} >= "${this.checkDate(from)}"^^xsd:date && ?${by} <="${this.checkDate(to)}"^^xsd:date)
}`;

    const params = new HttpParams()
      .set('url', this._zazukoEndpoint)
      .set('query', query)
      .set('useCaching', useCaching.toString());
      console.log(query);
    return this.http.get<Report[]>(this._api + 'sparql', { params: params });
  }

  getUniqueCantons(): Observable<any> {
    const query = `${this._prefix}
    SELECT DISTINCT ?kanton
FROM <https://linked.opendata.swiss/graph/blv/animalpest>
WHERE {
  ?kantonUri a gont:Canton ;
    rdfs:label ?kanton .
}
`;
    const params = new HttpParams()
      .set('url', this._zazukoEndpoint)
      .set('query', query)
      .set('useCaching', 'true');
    return this.http.get<any[]>(this._api + 'sparql', { params: params });
  }

  getUniqueMunicipalities(): Observable<any> {
    const query = `${this._prefix}
    SELECT DISTINCT ?gemeinde
FROM <https://linked.opendata.swiss/graph/blv/animalpest>
WHERE {
  ?gemeindeUri a gont:Municipality ;
    rdfs:label ?gemeinde .
}`;
    const params = new HttpParams()
      .set('url', this._zazukoEndpoint)
      .set('query', query)
      .set('useCaching', 'true');
    return this.http.get<any[]>(this._api + 'sparql', { params: params });
  }

  getUniqueEpidemicGroups(lang: string): Observable<any> {
    const query = `${this._prefix}
    SELECT DISTINCT ?seuchengruppeUri ?seuchen_gruppe
FROM <https://linked.opendata.swiss/graph/blv/animalpest>
WHERE {
?seuchengruppeUri skos:inScheme <http://ld.zazuko.com/animalpest/scheme/AnimaldiseaseGroup> ;
    rdfs:label ?seuchen_gruppe .

FILTER(langMatches(lang(?seuchen_gruppe), "${lang}"))
}
    `;
    const params = new HttpParams()
      .set('url', this._zazukoEndpoint)
      .set('query', query)
      .set('useCaching', 'true');
    return this.http.get<any[]>(this._api + 'sparql', { params: params });
  }

  getUniqueEpidemics(lang: string): Observable<any> {
    const query = `${this._prefix}
    SELECT DISTINCT ?tierseucheUri ?tier_seuche
FROM <https://linked.opendata.swiss/graph/blv/animalpest>
WHERE {
  ?tierseucheUri skos:inScheme <http://ld.zazuko.com/animalpest/scheme/Animaldisease> ;
    rdfs:label ?tier_seuche .
FILTER(langMatches(lang( ?tier_seuche), "${lang}"))
}`;
    const params = new HttpParams()
      .set('url', this._zazukoEndpoint)
      .set('query', query)
      .set('useCaching', 'true');
    return this.http.get<any[]>(this._api + 'sparql', { params: params });
  }

  getUniqueAnimalGroups(lang: string): Observable<any> {
    const query = `${this._prefix}
    SELECT DISTINCT ?tiergruppeUri ?tier_gruppe
FROM <https://linked.opendata.swiss/graph/blv/animalpest>
WHERE {
  ?tiergruppeUri skos:inScheme <http://ld.zazuko.com/animalpest/scheme/SpeciesGroup> ;
    rdfs:label ?tier_gruppe .
FILTER(langMatches(lang( ?tier_gruppe), "${lang}"))
}`;
    const params = new HttpParams()
      .set('url', this._zazukoEndpoint)
      .set('query', query)
      .set('useCaching', 'true');
    return this.http.get<any[]>(this._api + 'sparql', { params: params });
  }

  getUniqueAnimals(lang: string): Observable<any> {
    const query = `${this._prefix}
    SELECT DISTINCT ?tierartUri ?tier_art
FROM <https://linked.opendata.swiss/graph/blv/animalpest>
WHERE {
  ?tierartUri skos:inScheme <http://ld.zazuko.com/animalpest/scheme/Species> ;
    rdfs:label ?tier_art .

FILTER(langMatches(lang( ?tier_art), "${lang}"))
}`;
    const params = new HttpParams()
      .set('url', this._zazukoEndpoint)
      .set('query', query)
      .set('useCaching', 'true');
    return this.http.get<any[]>(this._api + 'sparql', { params: params });
  }


  getCantonWkts(): any {
    const query = `${this._prefix}
    SELECT * WHERE {
      {
        SELECT(max(?issued) AS ?mostRecentYear) WHERE {
          <https://ld.geo.admin.ch/boundaries/canton/1> dct:hasVersion/dct:issued ?issued.
        }
      }
      ?canton <http://www.geonames.org/ontology#featureCode> <http://www.geonames.org/ontology#A.ADM1> ;
      schema:name ?shape_label ;
      <http://purl.org/dc/terms/hasVersion> ?geomuniVersion .
      ?geomuniVersion <http://purl.org/dc/terms/issued> ?mostRecentYear ;
      <http://www.opengis.net/ont/geosparql#hasGeometry>/<http://www.opengis.net/ont/geosparql#asWKT> ?wkt .
      ?geomuniVersion <https://ld.geo.admin.ch/def/bfsNumber> ?shape_id .
    }
    `;
    const params = new HttpParams()
      .set('url', this._geoadminEndpoint)
      .set('query', query)
      .set('useCaching', 'true');
    return this.http.get<any>(this._api + 'sparql', { params: params });
  }

  getMunicWkts(): any {
    const query = `${this._prefix}
    SELECT * WHERE {
      {
        SELECT(max(?issued) AS ?mostRecentYear) WHERE {
          <https://ld.geo.admin.ch/boundaries/canton/1> dct:hasVersion/dct:issued ?issued.
        }
      }
        ?canton <http://www.geonames.org/ontology#featureCode> <http://www.geonames.org/ontology#A.ADM3> ;
      <http://purl.org/dc/terms/hasVersion> ?geomuniVersion .
      ?geomuniVersion <http://purl.org/dc/terms/issued> ?mostRecentYear ;
      schema:name ?shape_label ;
      <http://www.geonames.org/ontology#parentADM1>/schema:name ?parent_canton_label;
      <http://www.opengis.net/ont/geosparql#hasGeometry>/<http://www.opengis.net/ont/geosparql#asWKT> ?wkt .
      ?geomuniVersion <https://ld.geo.admin.ch/def/bfsNumber> ?shape_id .
    }`;
    const params = new HttpParams()
      .set('url', this._geoadminEndpoint)
      .set('query', query)
      .set('useCaching', 'true');
    return this.http.get<any>(this._api + 'sparql', { params: params });
  }

  // Format date to YYYY-MM-DD; Replace by todays date if no valid date
  private checkDate(date: string | Date): string {
    return (dayjs(date).isValid()) ? dayjs(date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
  }

}
