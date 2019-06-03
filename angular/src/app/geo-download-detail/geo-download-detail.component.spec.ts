import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GeoDownloadDetailComponent } from './geo-download-detail.component';

describe('GeoDownloadDetailComponent', () => {
  let component: GeoDownloadDetailComponent;
  let fixture: ComponentFixture<GeoDownloadDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GeoDownloadDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GeoDownloadDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
