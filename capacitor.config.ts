import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.travelmind.app',
  appName: 'TravelMind',
  webDir: 'dist',
  server: {
    // In production the WebView loads files from disk (no server.url).
    // During development you can uncomment the line below to point at your
    // local dev server for live-reload on device:
    // url: 'http://192.168.x.x:4000',
    // allowNavigation: ['travel-mind.rajeshrai248.uk'],
    cleartext: false,
  },
};

export default config;
