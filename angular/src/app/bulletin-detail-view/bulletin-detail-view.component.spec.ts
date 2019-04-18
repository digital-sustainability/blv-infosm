import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BulletinDetailViewComponent } from './bulletin-detail-view.component';

describe('BulletinDetailViewComponent', () => {
  let component: BulletinDetailViewComponent;
  let fixture: ComponentFixture<BulletinDetailViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BulletinDetailViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BulletinDetailViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
