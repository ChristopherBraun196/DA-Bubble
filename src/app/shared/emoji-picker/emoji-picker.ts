import { Component, output } from '@angular/core';

const EMOJIS = [
  '😀 😃 😄 😁 😆 😅 😂 🤣',
  '😊 😍 🥰 😘 😎 🤓 🤔 🙄',
  '😢 😭 😡 🥳 🤩 🤯 👍 👎',
  '👏 🙌 🙏 💪 ❤️ 🔥 ✅ 🚀',
].flatMap((group) => group.split(' '));

@Component({
  selector: 'app-emoji-picker',
  styleUrl: './emoji-picker.scss',
  templateUrl: './emoji-picker.html',
})
export class EmojiPicker {
  readonly selected = output<string>();
  protected readonly emojis = EMOJIS;
}
