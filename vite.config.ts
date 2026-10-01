import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, loadEnv } from 'vite';
import hostingConfig from './.openai/hosting.json';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';
const PRODUCTION_DATABASE_ID = 'b5384c4d-fd9a-417f-816b-a3a9a8ea4256';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const bindingConfig = (isBuild: boolean) => ({
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: process.env.CLOUDFLARE_D1_DATABASE_NAME || 'site-creator-d1',
          database_id: process.env.CLOUDFLARE_D1_DATABASE_ID ||
            (isBuild ? PRODUCTION_DATABASE_ID : SITE_CREATOR_PLACEHOLDER_DATABASE_ID),
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
});

export default defineConfig(async ({command, mode}) => {
  const localEnv = loadEnv(mode, process.cwd(), 'BOOKING_');
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: {...bindingConfig(command === 'build'), vars: command === 'serve' && localEnv.BOOKING_PUBLIC_ORIGIN
          ? Object.fromEntries(['BOOKING_PUBLIC_ORIGIN','BOOKING_RESEND_API_KEY','BOOKING_EMAIL_FROM'].filter(key=>localEnv[key]).map(key=>[key,localEnv[key]])) : {}},
      }),
    ],
  };
});
