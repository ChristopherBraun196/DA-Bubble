import { Component, output } from '@angular/core';

/** The emoji offered by the picker, grouped by row for readability. */
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
/**
 * Small grid of emoji to insert into a message or use as a reaction.
 *
 * @remarks
 * Purely presentational — the host decides what to do with the chosen
 * character.
 */
export class EmojiPicker {
  /** Emits the chosen emoji character. */
  readonly selected = output<string>();
  protected readonly emojis = EMOJIS;
}
