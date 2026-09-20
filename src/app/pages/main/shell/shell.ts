import { Component, DestroyRef, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { ChatView } from '../../chat/chat-view/chat-view';
import { DevspaceNav } from '../../Devspace-nav/devspace-nav/devspace-nav';
import { ThreadPanel } from '../../thread/thread-panel/thread-panel';
import { Topbar } from '../topbar/topbar';

@Component({
  imports: [Topbar, DevspaceNav, ChatView, ThreadPanel],
  selector: 'app-shell',
  styleUrl: './shell.scss',
  templateUrl: './shell.html',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly chats = inject(ChatService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly devspaceOpen = signal(true);
  protected readonly threadOpen = signal(true);

  constructor() {
    const user = this.auth.currentUser();

    if (user) {
      void this.chats.connect(user.uid);
    }

    this.destroyRef.onDestroy(() => this.chats.disconnect());
  }

  protected toggleDevspace(): void {
    this.devspaceOpen.update((value) => !value);
  }

  protected toggleThread(): void {
    this.threadOpen.update((value) => !value);
  }

  protected closeThread(): void {
    this.threadOpen.set(false);
  }
}
