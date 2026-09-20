import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MentionDropdown } from './mention-dropdown';

describe('MentionDropdown', () => {
  let component: MentionDropdown;
  let fixture: ComponentFixture<MentionDropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionDropdown],
    }).compileComponents();

    fixture = TestBed.createComponent(MentionDropdown);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
