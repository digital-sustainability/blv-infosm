import {
  Attribute,
  DataCubeEntryPoint
} from '@zazuko/query-rdf-data-cube';

export default async function singleValue(): Promise<any> {
  // instantiate an RDF Data Cube
  const entryPoint = new DataCubeEntryPoint(
    'https://trifid-lindas.test.cluster.ldbar.ch/query',
    { languages: ['de'] }
  );
  const [dataCube] = await entryPoint.dataCubesByGraphIri(
    'https://linked.opendata.swiss/graph/blv/animalpest'
  );

  const municipality = new Attribute({
    iri: 'http://ld.zazuko.com/animalpest/attribute/municipality'
  });

  return await dataCube.componentValues(municipality);
}
