import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { PasswordReset } from './password-reset';

describe('PasswordReset', () => {
  let component: PasswordReset;
  let fixture: ComponentFixture<PasswordReset>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordReset],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { sendPasswordReset: async () => undefined },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordReset);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
