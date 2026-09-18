import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatHeader } from './chat-header';

describe('ChatHeader', () => {
  let component: ChatHeader;
  let fixture: ComponentFixture<ChatHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatHeader],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatHeader);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('channelName', 'Entwicklerteam');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should switch from the members card to the add dialog', async () => {
    const element = fixture.nativeElement as HTMLElement;

    (element.querySelector('.chat-header__avatars') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(element.querySelector('.members-dialog')).toBeTruthy();

    (element.querySelector('.members-dialog__add') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(element.querySelector('.members-dialog')).toBeNull();
    expect(element.querySelector('.add-members')).toBeTruthy();
  });
});
