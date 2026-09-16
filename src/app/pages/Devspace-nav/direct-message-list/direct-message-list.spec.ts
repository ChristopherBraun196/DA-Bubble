import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DirectMessageList } from './direct-message-list';

describe('DirectMessageList', () => {
  let component: DirectMessageList;
  let fixture: ComponentFixture<DirectMessageList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectMessageList],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectMessageList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
