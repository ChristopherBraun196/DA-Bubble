import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PrivacyPolicy } from './privacy-policy';

describe('PrivacyPolicy', () => {
  let component: PrivacyPolicy;
  let fixture: ComponentFixture<PrivacyPolicy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivacyPolicy],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyPolicy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
