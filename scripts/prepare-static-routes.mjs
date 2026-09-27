import { copyFile, mkdir } from 'node:fs/promises';

const browserOutput = new URL('../dist/Da-Bubble/browser/', import.meta.url);
const clientIndex = new URL('index.csr.html', browserOutput);
const clientRoutes = ['login', 'register', 'password-reset', 'reset-password', 'main'];

await Promise.all(
  clientRoutes.map(async (route) => {
    const routeDirectory = new URL(`${route}/`, browserOutput);
    await mkdir(routeDirectory, { recursive: true });
    await copyFile(clientIndex, new URL('index.html', routeDirectory));
  }),
);

console.log(`Prepared static entry points for: ${clientRoutes.join(', ')}`);
