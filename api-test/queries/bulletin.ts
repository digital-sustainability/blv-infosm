import { literal, namedNode } from '@rdfjs/data-model';
import {
  Attribute,
  Dimension,
  DataCubeEntryPoint
} from '@zazuko/query-rdf-data-cube';

export default async function bulletin(): Promise<any> {
  /**
   * * Date of Publication
   * * Canton
   * * Municipality
   * * Epidemic
   * * Epidemic Group
   * * Animal Species
   * * Number of incidents
   * https://github.com/iamkun/dayjs
   */
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

  const publicationDate = new Attribute({
    iri: 'http://ld.zazuko.com/animalpest/attribute/release-internet'
  });
  const canton = new Attribute({
    iri: 'http://ld.zazuko.com/animalpest/attribute/canton'
  });
  const municipality = new Attribute({
    iri: 'http://ld.zazuko.com/animalpest/attribute/municipality'
  });

  const results = await dataCube
    .query()
    .select({
      species,
      animalDisease,
      publicationDate,
      canton,
      municipality
    })
    .filter([
      canton.equals('http://classifications.data.admin.ch/canton/be'),
      publicationDate.gt(
        literal(
          '2014-01-01',
          namedNode('http://www.w3.org/2001/XMLSchema#date')
        )
      ),
      publicationDate.lte(
        literal(
          '2014-12-31',
          namedNode('http://www.w3.org/2001/XMLSchema#date')
        )
      )
    ])
    .limit(1)
    .execute();

  return results;
}
