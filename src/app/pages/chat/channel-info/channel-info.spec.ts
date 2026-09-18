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

  it('should switch a section into edit mode and back on save', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const editButton = element.querySelector('.channel-info__action') as HTMLButtonElement;

    editButton.click();
    await fixture.whenStable();

    const input = element.querySelector('.channel-info__input') as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = 'Neuer Name';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    (element.querySelector('.channel-info__action') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(element.querySelector('.channel-info__input')).toBeNull();
    expect(element.querySelector('.channel-info__title')?.textContent).toContain('Neuer Name');
  });
});
