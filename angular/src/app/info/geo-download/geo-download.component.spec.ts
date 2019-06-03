import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GeoDownloadComponent } from './geo-download.component';

describe('GeoDownloadComponent', () => {
  let component: GeoDownloadComponent;
  let fixture: ComponentFixture<GeoDownloadComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GeoDownloadComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GeoDownloadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
