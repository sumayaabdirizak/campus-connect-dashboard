import type { NextConfig } from 'next';
import path from 'path';
import { withSentryConfig } from '@sentry/nextjs';

const baseConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  devIndicators: false,

  // The `@shared/*` alias (see tsconfig.json) maps to the repo-root `shared/`
  // directory, which lives one level above this Next.js app. Turbopack infers
  // its resolution root from the nearest lockfile — here only
  // `frontend/package-lock.json` exists, so it picks `frontend/` and anything
  // under `../shared` falls outside the root and fails with "Module not
  // found". Pinning the root to the repo parent brings the shared module back
  // into scope. (Resolution boundary only — tsconfig paths like `@/*` are
  // still read from this app's own tsconfig.)
  turbopack: {
    root: path.join(__dirname, '..')
  },

  experimental: {
    optimizePackageImports: ['lucide-react', '@tabler/icons-react', 'recharts', 'date-fns']
  },

  // Preserve bookmarks to the legacy PascalCase dean offerings URL.
  async redirects() {
    return [
      {
        source: '/dashboard/dean/Assigning',
        destination: '/dashboard/dean/assigning',
        permanent: true
      }
    ];
  },

  // Proxy the backend download endpoint through the Next.js server so the
  // browser makes a same-origin request.  Same-origin requests automatically
  // include every cookie (no CORS, no credentials juggling), so the
  // httpOnly auth_token cookie reaches the backend without any extra work.
  async rewrites() {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const apiOrigin = apiBase.replace(/\/api\/?$/, '');
    return [
      {
        source: '/api/download/:id',
        destination: `${apiBase}/resources/:id/download`
      },
      {
        source: '/uploads/:path*',
        destination: `${apiOrigin}/uploads/:path*`
      }
    ];
  },

  images: {
    remotePatterns: [
      (() => {
        const origin = (
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
        ).replace(/\/api\/?$/, '');
        const url = new URL(origin);
        return {
          protocol: url.protocol.replace(':', '') as 'http' | 'https',
          hostname: url.hostname,
          port: url.port
        };
      })(),
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: ''
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000'
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000'
      }
    ]
  },

  transpilePackages: ['geist'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
};

const sentryEnabled =
  process.env.NEXT_PUBLIC_SENTRY_DISABLED !== 'true' &&
  Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

const nextConfig = sentryEnabled
  ? withSentryConfig(baseConfig, {
      org: process.env.NEXT_PUBLIC_SENTRY_ORG,
      project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
      telemetry: false,
      webpack: {
        reactComponentAnnotation: {
          enabled: true
        },
        treeshake: {
          removeDebugLogging: true
        }
      },
      sourcemaps: {
        disable: !process.env.NEXT_PUBLIC_SENTRY_ORG || !process.env.NEXT_PUBLIC_SENTRY_PROJECT
      }
    })
  : baseConfig;

export default nextConfig;
