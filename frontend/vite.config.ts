import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function noCacheDevDeps() {
  return {
    name: 'no-cache-dev-deps',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req?.url || '';
        if (
          url.startsWith('/node_modules/.vite/') ||
          url.startsWith('/@vite') ||
          url.startsWith('/src/') ||
          url.startsWith('/locales/')
        ) {
          res.setHeader('Cache-Control', 'no-store');
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [
    noCacheDevDeps(),
    react({
    jsxImportSource: '@emotion/react',
    babel: {
      plugins: ['@emotion/babel-plugin'],
    },
    })
  ],

  // Enhanced development server configuration
  server: {
    port: 3000,
    strictPort: true,
    host: '127.0.0.1',
    headers: {
      'Cache-Control': 'no-store'
    },
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
    },
    open: false, // Don't auto-open browser in debug mode
    cors: true,
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('🔧 Proxy error:', err);
          });
        },
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        ws: true,
      }
    },
    watch: {
      usePolling: true,
      interval: 100
    },
    fs: {
      strict: false
    }
  },

  // Enhanced build configuration
  build: {
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['axios', 'socket.io-client']
        }
      }
    }
  },

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@jest/globals': path.resolve(__dirname, './src/test/jest-globals.ts'),
    },
  },

  // Environment variables
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      REACT_APP_DEBUG: JSON.stringify(process.env.REACT_APP_DEBUG || 'true'),
      REACT_APP_API_URL: JSON.stringify(process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api/v1'),
      REACT_APP_SOCKET_URL: JSON.stringify(process.env.REACT_APP_SOCKET_URL || 'http://127.0.0.1:5000'),
    }
  },

  // Optimizations for development
  optimizeDeps: {
    force: true,
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'socket.io-client',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tooltip',
      'react-swipeable',
      'date-fns',
      'framer-motion',
      'lucide-react',
      'clsx',
      'tailwind-merge'
    ],
    exclude: ['@emotion/react', '@emotion/styled']
  },

  // CSS configuration
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts', './src/test/vitest.setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx}'],
    testTimeout: 10000
  }
})
