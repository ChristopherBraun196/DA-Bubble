import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Shell } from './shell';

describe('Shell', () => {
  let component: Shell;
  let fixture: ComponentFixture<Shell>;

  beforeEach(async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    await TestBed.configureTestingModule({
      imports: [Shell],
    }).compileComponents();

    fixture = TestBed.createComponent(Shell);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
