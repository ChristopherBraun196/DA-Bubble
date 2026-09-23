import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Render modes for server-side rendering.
 *
 * @remarks
 * Anything touching Firebase Auth renders on the client, because the Firebase
 * SDK has no server counterpart. The remaining static pages are prerendered.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'login',
    renderMode: RenderMode.Client,
  },
  {
    path: 'register',
    renderMode: RenderMode.Client,
  },
  {
    path: 'password-reset',
    renderMode: RenderMode.Client,
  },
  {
    path: 'reset-password',
    renderMode: RenderMode.Client,
  },
  {
    path: 'main',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
