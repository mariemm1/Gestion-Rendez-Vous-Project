import { TestBed } from '@angular/core/testing';

import { MediaService } from './media';

describe('Media', () => {
  let service: MediaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MediaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
