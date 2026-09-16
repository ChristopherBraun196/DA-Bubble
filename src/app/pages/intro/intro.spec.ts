import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Intro } from './intro';

describe('Intro', () => {
  let component: Intro;
  let fixture: ComponentFixture<Intro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Intro],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Intro);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
