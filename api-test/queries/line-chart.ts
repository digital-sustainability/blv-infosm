import { literal, namedNode } from '@rdfjs/data-model';
import {
  Attribute,
  Dimension,
  DataCubeEntryPoint
} from '@zazuko/query-rdf-data-cube';

export default async function lineChart(): Promise<any> {

  // instantiate an RDF Data Cube
  const entryPoint = new DataCubeEntryPoint(
    'https://trifid-lindas.test.cluster.ldbar.ch/query',
    { languages: ['de'] }
  );
  const [dataCube] = await entryPoint.dataCubesByGraphIri(
    'https://linked.opendata.swiss/graph/blv/animalpest'
  );

  const species = new Dimension({
    iri: 'http://ld.zazuko.com/animalpest/dimension/species'
  });
  const animalDisease = new Dimension({
    iri: 'http://ld.zazuko.com/animalpest/dimension/animaldisease'
  });

  const diagnosticDate = new Attribute({
    iri: "http://ld.zazuko.com/animalpest/attribute/diagnose-date"
  });

  const query = dataCube
    .query()
    .select({
      species: species,
      animalDisease: animalDisease,
      diagnosticDate
    })
    .filter([
      animalDisease.equals("http://ld.zazuko.com/animalpest/animaldisease/10"),
      // animalDisease.equals(
      //   literal(
      //     "Lungenadenomatose",
      //     namedNode("'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString'")
      //   )
      // ),
      diagnosticDate.gt(
        literal(
          "2018-01-01",
          namedNode("http://www.w3.org/2001/XMLSchema#date")
        )
      ),
      diagnosticDate.lte(
        literal(
          "2018-12-31",
          namedNode("http://www.w3.org/2001/XMLSchema#date")
        )
      )
    ])
    .limit(null)
    .groupBy("animalDisease");
    // .groupBy("species");

  const results = await query.execute();

  return results;
}
