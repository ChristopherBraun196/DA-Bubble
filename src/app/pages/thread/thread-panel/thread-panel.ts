import { Component, output, signal } from '@angular/core';
import { ThreadHeader } from '../thread-header/thread-header';

@Component({
  imports: [ThreadHeader],
  selector: 'app-thread-panel',
  styleUrl: './thread-panel.scss',
  templateUrl: './thread-panel.html',
})
export class ThreadPanel {
  readonly closed = output<void>();

  /** Platzhalter, kommt später aus Firebase. */
  protected readonly channelName = signal('Entwicklerteam');
}
