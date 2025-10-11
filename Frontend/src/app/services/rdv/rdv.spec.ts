import { TestBed } from '@angular/core/testing';

import { Rdv } from './rdv';

describe('Rdv', () => {
  let service: Rdv;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Rdv);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
