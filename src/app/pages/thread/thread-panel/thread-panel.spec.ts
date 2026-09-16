import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThreadPanel } from './thread-panel';

describe('ThreadPanel', () => {
  let component: ThreadPanel;
  let fixture: ComponentFixture<ThreadPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreadPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(ThreadPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
