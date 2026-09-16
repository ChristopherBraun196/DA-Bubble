import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DevspaceNav } from './devspace-nav';

describe('DevspaceNav', () => {
  let component: DevspaceNav;
  let fixture: ComponentFixture<DevspaceNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevspaceNav],
    }).compileComponents();

    fixture = TestBed.createComponent(DevspaceNav);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
