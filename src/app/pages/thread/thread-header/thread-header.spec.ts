import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThreadHeader } from './thread-header';

describe('ThreadHeader', () => {
  let component: ThreadHeader;
  let fixture: ComponentFixture<ThreadHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreadHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(ThreadHeader);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('channelName', 'Entwicklerteam');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
