import { Directive, ElementRef, inject, Renderer2 } from '@angular/core';

/** Shown whenever the original avatar cannot be loaded. */
const DEFAULT_AVATAR = '/img/Profile_Guest.png';

@Directive({
  selector: 'img[appAvatarFallback]',
  host: {
    referrerpolicy: 'no-referrer',
    '(error)': 'showFallback()',
  },
})
/**
 * Swaps in a placeholder when an avatar image fails to load.
 *
 * @remarks
 * Google account photos are frequently blocked by the referrer policy, which
 * would otherwise leave a broken image in every message row.
 */
export class AvatarFallback {
  private readonly element = inject(ElementRef<HTMLImageElement>);
  private readonly renderer = inject(Renderer2);

  /** Replaces the source with the placeholder, unless it is already shown. */
  protected showFallback(): void {
    const image = this.element.nativeElement;
    if (image.src.endsWith(DEFAULT_AVATAR)) {
      return;
    }
    this.renderer.setProperty(image, 'src', DEFAULT_AVATAR);
  }
}
