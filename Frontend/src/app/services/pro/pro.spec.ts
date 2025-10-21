import { TestBed } from '@angular/core/testing';

import { ProService } from './pro';

describe('Pro', () => {
  let service: ProService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
