import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChannelInfo } from './channel-info';

describe('ChannelInfo', () => {
  let component: ChannelInfo;
  let fixture: ComponentFixture<ChannelInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelInfo],
    }).compileComponents();

    fixture = TestBed.createComponent(ChannelInfo);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('channelName', 'Entwicklerteam');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should switch a section into edit mode', async () => {
    const element = fixture.nativeElement as HTMLElement;

    (element.querySelector('.channel-info__action') as HTMLButtonElement).click();
    await fixture.whenStable();

    const input = element.querySelector('.channel-info__input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.placeholder).toBe('Entwicklerteam');
  });

  it('should close the edit mode without saving an empty draft', async () => {
    const element = fixture.nativeElement as HTMLElement;

    (element.querySelector('.channel-info__action') as HTMLButtonElement).click();
    await fixture.whenStable();

    (element.querySelector('.channel-info__action') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(element.querySelector('.channel-info__input')).toBeNull();
  });
});
