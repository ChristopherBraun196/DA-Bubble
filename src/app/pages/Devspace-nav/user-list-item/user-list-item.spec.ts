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
    fixture.componentRef.setInput('name', 'Frederik Beck');
    fixture.componentRef.setInput('avatar', '/img/Profile_picture_1.png');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
