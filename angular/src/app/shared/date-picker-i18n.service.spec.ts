import { TestBed } from '@angular/core/testing';

import { DatePickerI18nService } from './date-picker-i18n.service';

describe('DatePickerI18nService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DatePickerI18nService = TestBed.get(DatePickerI18nService);
    expect(service).toBeTruthy();
  });
});
