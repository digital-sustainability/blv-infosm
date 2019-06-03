import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BulletinDetailComponent } from './bulletin-detail.component';

describe('BulletinDetailComponent', () => {
  let component: BulletinDetailComponent;
  let fixture: ComponentFixture<BulletinDetailComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BulletinDetailComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BulletinDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
