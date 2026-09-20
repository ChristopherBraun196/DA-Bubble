import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileDialog } from './profile-dialog';

describe('ProfileDialog', () => {
  let component: ProfileDialog;
  let fixture: ComponentFixture<ProfileDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileDialog],
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
