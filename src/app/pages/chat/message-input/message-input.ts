import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-message-input',
  styleUrl: './message-input.scss',
  templateUrl: './message-input.html',
})
export class MessageInput {
  readonly placeholder = input('Nachricht schreiben');
}
