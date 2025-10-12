import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientBookPage } from './client-book.page';

describe('ClientBookPage', () => {
  let component: ClientBookPage;
  let fixture: ComponentFixture<ClientBookPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClientBookPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
