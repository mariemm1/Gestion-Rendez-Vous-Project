import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProDisposPage } from './pro-dispos.page';

describe('ProDisposPage', () => {
  let component: ProDisposPage;
  let fixture: ComponentFixture<ProDisposPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProDisposPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
