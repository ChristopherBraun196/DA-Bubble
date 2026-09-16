import {
  afterNextRender,
  Component,
  OnDestroy,
  output,
  OutputEmitterRef,
  signal,
  WritableSignal,
} from '@angular/core';

type IntroAnimationPhase = 'icon' | 'positioned' | 'expanded' | 'login';

const LOGO_POSITION_DELAY = 500;
const LOGO_REVEAL_DELAY = 800;
const LOGIN_TRANSITION_START = 1540;
const ANIMATION_DURATION = 2040;

/** Displays the timed logo transition between the intro and login shell. */
@Component({
  selector: 'app-intro-animation',
  imports: [],
  templateUrl: './intro-animation.html',
  styleUrl: './intro-animation.scss',
})
export class IntroAnimation implements OnDestroy {
  protected readonly phase: WritableSignal<IntroAnimationPhase> = signal('icon');
  protected readonly isPositioned = (): boolean =>
    this.phase() === 'positioned' || this.phase() === 'expanded';
  protected readonly isExpanded = (): boolean => this.phase() === 'expanded';
  protected readonly isLogin = (): boolean => this.phase() === 'login';
  public readonly animationCompleted: OutputEmitterRef<void> = output<void>();

  private readonly timerIds: number[] = [];

  constructor() {
    afterNextRender((): void => this.startAnimation());
  }

  public ngOnDestroy(): void {
    this.timerIds.forEach((timerId: number): void => window.clearTimeout(timerId));
  }

  /** Starts the Figma-defined logo and page transition sequence. */
  private startAnimation(): void {
    this.timerIds.push(
      window.setTimeout((): void => this.phase.set('positioned'), LOGO_POSITION_DELAY),
      window.setTimeout((): void => this.phase.set('expanded'), LOGO_REVEAL_DELAY),
      window.setTimeout((): void => this.phase.set('login'), LOGIN_TRANSITION_START),
      window.setTimeout((): void => this.animationCompleted.emit(), ANIMATION_DURATION),
    );
  }
}
