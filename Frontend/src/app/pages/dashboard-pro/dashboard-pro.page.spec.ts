import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardProPage } from './dashboard-pro.page';

describe('DashboardProPage', () => {
  let component: DashboardProPage;
  let fixture: ComponentFixture<DashboardProPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardProPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
