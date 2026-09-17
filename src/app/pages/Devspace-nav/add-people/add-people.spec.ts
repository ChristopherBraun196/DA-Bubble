import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddPeople } from './add-people';

describe('AddPeople', () => {
  let component: AddPeople;
  let fixture: ComponentFixture<AddPeople>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPeople],
    }).compileComponents();

    fixture = TestBed.createComponent(AddPeople);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
