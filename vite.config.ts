import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Content Security Policy for development.
      // connect-src also allows the local Supabase stack (127.0.0.1:54321) so
      // the app works against `npx supabase start`. Development only - the
      // production CSP lives in vercel.json and is unaffected.
      'Content-Security-Policy': mode === 'development'
        ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
        : undefined,
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // The CSP <meta> tag in index.html only allows https://*.supabase.co, which
    // blocks the local Supabase stack on http://127.0.0.1:54321 and leaves the
    // app rendering a blank page against `npx supabase start`. Strip the tag in
    // dev so the server header above (which does allow localhost) applies.
    // Production builds keep the meta tag untouched.
    mode === 'development' && {
      name: 'strip-csp-meta-in-dev',
      transformIndexHtml(html: string) {
        return html.replace(
          /\s*<meta http-equiv="Content-Security-Policy"[\s\S]*?\/>/,
          '',
        );
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Generate content hashes for script integrity
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  }
}));
