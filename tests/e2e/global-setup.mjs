// Build the editor interface once, so the journey runs against the files the service serves.
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

export default async function globalSetup() {
  await build({ root: fileURLToPath(new URL('../../apps/editor', import.meta.url)), logLevel: 'warn' });
}
