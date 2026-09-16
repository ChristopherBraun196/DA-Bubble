import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserListItem } from './user-list-item';

describe('UserListItem', () => {
  let component: UserListItem;
  let fixture: ComponentFixture<UserListItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListItem],
    }).compileComponents();

    fixture = TestBed.createComponent(UserListItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
