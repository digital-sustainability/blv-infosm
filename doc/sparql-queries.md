# Main data
Includes *tier_gruppen*.
Query Endpoint: http://ld.zazuko.com/sparql/#

~~~SPARQL
BASE <https://blv.ld.admin.ch/animalpest/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX gont: <https://gont.ch/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX blv-attribute: <http://ld.zazuko.com/animalpest/attribute/>
PREFIX blv-dimension: <http://ld.zazuko.com/animalpest/dimension/>

SELECT *
FROM <https://linked.opendata.swiss/graph/blv/animalpest> WHERE {
    ?sub a qb:Observation ;
        blv-attribute:diagnose_datum ?diagnose_datum ;
        blv-attribute:kanton_id/rdfs:label ?kanton ;
        blv-attribute:gemeinde_id/rdfs:label ?gemeinde ;
        blv-dimension:tier-art ?tierartUri ;

        blv-dimension:tier-seuche ?seuchen_uri .

    ?tierartUri rdfs:label ?tierart ;
        skos:broader/rdfs:label ?tier_gruppe .

    ?seuchen_uri rdfs:label ?seuche ;
        skos:broader/rdfs:label ?seuchen_gruppe .

    FILTER(langMatches(lang(?tierart), "de"))
    FILTER(langMatches(lang(?seuche), "de"))
    FILTER(langMatches(lang(?seuchen_gruppe), "de"))
    FILTER(langMatches(lang(?tier_gruppe), "de"))
    FILTER (?diagnose_datum >= "2015-12-21"^^xsd:date && ?diagnose_datum
<="2015-12-27"^^xsd:date)
}
~~~

# Get All Cantons
Only includes the lates yearly version of the bounderies (e.g 2019)
Query Endpoint: https://ld.geo.admin.ch/sparql/#

~~~SPARQL
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema>
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX gont: <https://gont.ch/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX blv-attribute: <http://ld.zazuko.com/animalpest/attribute/>
PREFIX blv-dimension: <http://ld.zazuko.com/animalpest/dimension/>
PREFIX schema: <http://schema.org/>
  
SELECT * WHERE {
  {
    SELECT (max(?issued) AS ?mostRecentYear) WHERE {
  	<https://ld.geo.admin.ch/boundaries/canton/1> dct:hasVersion/dct:issued ?issued.
    } 
  }
	?canton <http://www.geonames.org/ontology#featureCode> <http://www.geonames.org/ontology#A.ADM1> ;
	<http://purl.org/dc/terms/hasVersion> ?geomuniVersion .
  ?geomuniVersion <http://purl.org/dc/terms/issued> ?mostRecentYear ;
   <http://www.opengis.net/ont/geosparql#hasGeometry>/<http://www.opengis.net/ont/geosparql#asWKT> ?wkt .
 }
 # LIMIT 10
~~~

# Get All Municipalities
Take the exact same query for all Cantons and replace *#A.ADM1* with *#A.ADM3*

# Get All Municipalities Per Canton
~~~SPARQL
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema>
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX gont: <https://gont.ch/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX blv-attribute: <http://ld.zazuko.com/animalpest/attribute/>
PREFIX blv-dimension: <http://ld.zazuko.com/animalpest/dimension/>
PREFIX schema: <http://schema.org/>
  
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
#    <http://www.geonames.org/ontology#parentADM1> ?canton  ;
    <http://www.geonames.org/ontology#parentADM1> <https://ld.geo.admin.ch/boundaries/canton/3:2019>  ;
    <http://www.opengis.net/ont/geosparql#hasGeometry>/<http://www.opengis.net/ont/geosparql#asWKT> ?wkt .
}
~~~


# Get All Municipalities That Don't Have a Canton
~~~SPARQL
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema>
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX gont: <https://gont.ch/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX blv-attribute: <http://ld.zazuko.com/animalpest/attribute/>
PREFIX blv-dimension: <http://ld.zazuko.com/animalpest/dimension/>
PREFIX schema: <http://schema.org/>
  
SELECT * WHERE {
  {
    SELECT (max(?issued) AS ?mostRecentYear) WHERE {
  	<https://ld.geo.admin.ch/boundaries/municipality/351> dct:hasVersion/dct:issued ?issued.
  } 
}
  
  	?municipality <http://www.geonames.org/ontology#featureCode> <http://www.geonames.org/ontology#A.ADM3> ;
    <http://purl.org/dc/terms/hasVersion> ?geomuniVersion .
  
    ?geomuniVersion <http://purl.org/dc/terms/issued> ?mostRecentYear ;
    <http://www.opengis.net/ont/geosparql#hasGeometry>/<http://www.opengis.net/ont/geosparql#asWKT> ?wkt .

  MINUS {
  	?geomuniVersion  <http://www.geonames.org/ontology#parentADM1> ?canton  .
  }
}
~~~

# Previous Queries / Notes
Last used queries come first

Aktuelles Jahr Geoadmin
~~~SPARQL
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX gont: <https://gont.ch/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX blv-attribute: <http://ld.zazuko.com/animalpest/attribute/>
PREFIX blv-dimension: <http://ld.zazuko.com/animalpest/dimension/>
PREFIX schema: <http://schema.org/>

SELECT (max(?issued) AS ?mostRecentYear) WHERE {
  	<https://ld.geo.admin.ch/boundaries/canton/1> dct:hasVersion/dct:issued ?issued.
} 
LIMIT 10
~~~

~~~SPARQL
BASE <https://blv.ld.admin.ch/animalpest/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX gont: <https://gont.ch/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT *
FROM <https://linked.opendata.swiss/graph/blv/animalpest> WHERE {
  ?sub a qb:Observation ;
    <http://ld.zazuko.com/animalpest/attribute/diagnose_datum> ?diagnose_datum;
    #<http://ld.zazuko.com/animalpest/attribute/kanton_id>/rdfs:label ?kanton;
    <http://ld.zazuko.com/animalpest/attribute/gemeinde_id>/rdfs:label ?gemeinde;
	<http://ld.zazuko.com/animalpest/dimension/tier-art>/rdfs:label ?tierart;
    <http://ld.zazuko.com/animalpest/dimension/tier-seuche> ?seuchenUri.
    ?seuchenUri rdfs:label ?seuche;
        skos:broader/rdfs:label ?seuchenGruppe.

FILTER(langMatches(lang(?seuche), "de"))
FILTER(langMatches(lang(?tierart), "de"))
FILTER(langMatches(lang(?seuchenGruppe), "de"))
FILTER (?diagnose_datum >= "2017-01-01"^^xsd:date && ?diagnose_datum <="2017-12-31"^^xsd:date) 
}
#LIMIT 50
~~~

~~~SPARQL
BASE <https://blv.ld.admin.ch/animalpest/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX gont: <https://gont.ch/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT *
FROM <https://linked.opendata.swiss/graph/blv/animalpest> WHERE {
  ?sub a qb:Observation ;
    <http://ld.zazuko.com/animalpest/attribute/diagnose_datum> ?diagnose_datum;
    #<http://ld.zazuko.com/animalpest/attribute/kanton_id>/rdfs:label ?kanton;
    <http://ld.zazuko.com/animalpest/attribute/gemeinde_id>/rdfs:label ?gemeinde;
	<http://ld.zazuko.com/animalpest/dimension/tier-art>/rdfs:label ?tierart;
    <http://ld.zazuko.com/animalpest/dimension/tier-seuche> ?seuchenUri.
    ?seuchenUri rdfs:label ?seuche;
        skos:broader/rdfs:label ?seuchenGruppe.

FILTER(langMatches(lang(?seuche), "de"))
FILTER(langMatches(lang(?tierart), "de"))
FILTER(langMatches(lang(?seuchenGruppe), "de"))
FILTER (?diagnose_datum >= "2017-01-01"^^xsd:date && ?diagnose_datum <="2017-12-31"^^xsd:date) 
}
#LIMIT 50
~~~

~~~SPARQL
BASE <https://blv.ld.admin.ch/animalpest/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX qb: <http://purl.org/linked-data/cube#>
PREFIX gont: <https://gont.ch/>

SELECT *
FROM <https://linked.opendata.swiss/graph/blv/animalpest> WHERE {
  ?sub a qb:Observation ;
        <http://ld.zazuko.com/animalpest/attribute/diagnose_datum> ?diagnose_datum;
      	#<http://ld.zazuko.com/animalpest/attribute/kanton_id>/rdfs:label ?kanton;
        <http://ld.zazuko.com/animalpest/attribute/gemeinde_id>/rdfs:label ?gemeinde;
		<http://ld.zazuko.com/animalpest/dimension/tier-art>/rdfs:label ?tierart;
        <http://ld.zazuko.com/animalpest/dimension/tier-seuche>/rdfs:label ?seuche;
		<http://ld.zazuko.com/animalpest/measure/tiere_infiziert> ?infiziert;
  		<http://ld.zazuko.com/animalpest/measure/tiere_getoetet> ?getoetet.
  FILTER(langMatches(lang(?seuche), "de"))
  FILTER(langMatches(lang(?tierart), "de"))
  FILTER (?diagnose_datum >= "2017-01-01"^^xsd:date && ?diagnose_datum <="2017-12-31"^^xsd:date) 
}
#LIMIT 50
~~~