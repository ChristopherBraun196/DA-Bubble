import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MembersDialog } from './members-dialog';

describe('MembersDialog', () => {
  let component: MembersDialog;
  let fixture: ComponentFixture<MembersDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(MembersDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
