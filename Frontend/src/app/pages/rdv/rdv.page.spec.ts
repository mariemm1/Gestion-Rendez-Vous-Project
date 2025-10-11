import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RdvPage } from './rdv.page';

describe('RdvPage', () => {
  let component: RdvPage;
  let fixture: ComponentFixture<RdvPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RdvPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
