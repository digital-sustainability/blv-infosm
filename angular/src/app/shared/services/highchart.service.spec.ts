import { TestBed } from '@angular/core/testing';

import { HighchartService } from './highchart.service';

describe('HighchartService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: HighchartService = TestBed.get(HighchartService);
    expect(service).toBeTruthy();
  });
});
