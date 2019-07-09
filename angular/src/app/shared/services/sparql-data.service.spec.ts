import { TestBed } from '@angular/core/testing';

import { SparqlDataService } from './sparql-data.service';


describe('SparqlDataService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));
it('should be created', () => {
    const service: SparqlDataService = TestBed.get(SparqlDataService);
    expect(service).toBeTruthy();
    });
});
