import { TestBed } from '@angular/core/testing';

import { RdvService } from './rdv';

describe('Rdv', () => {
  let service: RdvService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RdvService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
