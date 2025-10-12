import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientProListPage } from './client-pro-list.page';

describe('ClientProListPage', () => {
  let component: ClientProListPage;
  let fixture: ComponentFixture<ClientProListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClientProListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
