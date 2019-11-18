import { TestBed } from '@angular/core/testing';

import { SubscriptionManagerService } from './subscription-manager.service';

describe('SubscriptionManagerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SubscriptionManagerService = TestBed.get(SubscriptionManagerService);
    expect(service).toBeTruthy();
  });
});
