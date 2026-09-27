import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../../core/services/auth.service';
import { ProfileDialog } from './profile-dialog';

describe('ProfileDialog', () => {
  let component: ProfileDialog;
  let fixture: ComponentFixture<ProfileDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileDialog],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({ uid: 'user-1', isAnonymous: false }),
            displayName: signal('Test User'),
            photoURL: signal('/img/Profile.png'),
            email: signal('test@example.com'),
            updateDisplayName: async () => undefined,
            updatePhotoURL: async () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should switch to the edit view and back on cancel', async () => {
    const element = fixture.nativeElement as HTMLElement;

    (element.querySelector('.profile__edit') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(element.querySelector('.profile__input')).toBeTruthy();
    expect(element.querySelector('.profile__title')?.textContent).toContain(
      'Dein Profil bearbeiten',
    );

    (element.querySelector('.profile__button--ghost') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(element.querySelector('.profile__input')).toBeNull();
    expect(element.querySelector('.profile__title')?.textContent).toContain('Profil');
  });
});
