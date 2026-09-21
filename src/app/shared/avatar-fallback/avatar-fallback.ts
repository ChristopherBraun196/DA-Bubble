import { Directive, ElementRef, inject, Renderer2 } from '@angular/core';

const DEFAULT_AVATAR = '/img/Profile_Guest.png';

@Directive({
  selector: 'img[appAvatarFallback]',
  host: {
    referrerpolicy: 'no-referrer',
    '(error)': 'showFallback()',
  },
})
export class AvatarFallback {
  private readonly element = inject(ElementRef<HTMLImageElement>);
  private readonly renderer = inject(Renderer2);

  protected showFallback(): void {
    const image = this.element.nativeElement;
    if (image.src.endsWith(DEFAULT_AVATAR)) {
      return;
    }
    this.renderer.setProperty(image, 'src', DEFAULT_AVATAR);
  }
}
