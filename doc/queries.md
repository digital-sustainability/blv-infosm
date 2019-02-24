# Main Query
~~~
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


# Zeitliche Auswertung
## Filter enthält
- Seuche
- Tierart
- Intervall: jährlich, halb- oder vierteljährlich --> Frontent

## Noch offen
- **Seuchenspezifikation**?
- **Tierkategorie**?
- Auflösung nach **Kanton** noch nicht möglich
- Subqueris um **Seuchengruppen** zu erhalten

# Auswertung nach Häufigkeit
## Filter enthält
- Tierart
- Seuche

## Noch offen
- **Tierkategorie**?
- Auflösung nach **Kanton** noch nicht möglich
- Subqueris um **Seuchengruppen** zu erhalten

## Anzeige
- Anzahl Fälle
- Fälle in %
- Fälle pro Gruppe

# Auswertung nach Geografie
Noch offen

# Auswertung in Listenform
## Filter enthält
- Datum (von-bis Zeitraum)
    - Anfangsdatum?
- Suche
    - Wird in der bestehenden Liste gesucht oder soll für eine Suche evt. eigene Anfragen verschickt werden?
- Seuchengruppe (4 einzelen Seuchen oder alle)
    - Subqueris um **Seuchengruppen** zu erhalten
- \> Tierart (alle)
    - Nuller Anzeige, wenn keine Tierart zur Seuche existiert?
    - Oder per *distinct* alle möglichen Tierarten abfragen? So können weitere Filter aus vorhergehenden Abfragen entstehen.


# (Aktuelles) Bulletin
Beim aktuellen liegt der Fokus auf den letzten 7 Tagen. Alle Fälle zu einer Seuche sollten zusammengefasst werden.

## Filter enthält
Gleich wie bei der Listenform


# Previous Queries
~~~
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