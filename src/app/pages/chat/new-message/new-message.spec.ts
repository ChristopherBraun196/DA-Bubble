import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewMessage } from './new-message';

describe('NewMessage', () => {
  let component: NewMessage;
  let fixture: ComponentFixture<NewMessage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewMessage],
    }).compileComponents();

    fixture = TestBed.createComponent(NewMessage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
