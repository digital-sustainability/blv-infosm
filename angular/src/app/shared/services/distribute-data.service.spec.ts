import { TestBed } from '@angular/core/testing';

import { DistributeDataService } from './distribute-data.service';

describe('DistributeDataService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DistributeDataService = TestBed.get(DistributeDataService);
    expect(service).toBeTruthy();
  });
});
