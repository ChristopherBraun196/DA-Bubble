import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

const MESSAGE_EMOJIS = [
  '😀 😃 😄 😁 😆 😅 😂 🤣',
  '😊 😍 🥰 😘 😎 🤓 🤔 🙄',
  '😢 😭 😡 🥳 🤩 🤯 👍 👎',
  '👏 🙌 🙏 💪 ❤️ 🔥 ✅ 🚀',
].flatMap((group) => group.split(' '));

@Component({
  imports: [],
  selector: 'app-message-input',
  styleUrl: './message-input.scss',
  templateUrl: './message-input.html',
})
export class MessageInput {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly placeholder = input('Nachricht schreiben');
  readonly disabled = input(false);
  readonly messageSent = output<string>();
  readonly sendDisabled = input(false);

  protected readonly message = signal('');
  protected readonly emojiPickerOpen = signal(false);
  protected readonly emojis = MESSAGE_EMOJIS;
  protected readonly messageField = viewChild<ElementRef<HTMLTextAreaElement>>('messageField');

  @HostListener('document:click', ['$event'])
  protected closeEmojiPickerOutside(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.emojiPickerOpen.set(false);
    }
  }

  protected updateMessage(event: Event): void {
    this.message.set((event.target as HTMLTextAreaElement).value);
  }

  protected toggleEmojiPicker(): void {
    this.emojiPickerOpen.update((open) => !open);
  }

  protected insertEmoji(emoji: string): void {
    const field = this.messageField()?.nativeElement;
    const start = field?.selectionStart ?? this.message().length;
    const end = field?.selectionEnd ?? start;
    this.message.update((text) => text.slice(0, start) + emoji + text.slice(end));
    this.emojiPickerOpen.set(false);
    this.restoreCursor(field, start + emoji.length);
  }

  private restoreCursor(field: HTMLTextAreaElement | undefined, position: number): void {
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(position, position);
    });
  }

  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    this.submitMessage();
  }

  protected submitMessage(): void {
    const message = this.message().trim();

    if (!message || this.disabled() || this.sendDisabled()) {
      return;
    }

    this.messageSent.emit(message);
    this.message.set('');
    this.emojiPickerOpen.set(false);
  }
}
