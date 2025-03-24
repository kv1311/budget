import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budget',
  appName: 'budget',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: true,
    },
  },
  
};


export default config;
