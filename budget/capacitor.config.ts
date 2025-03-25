import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budget',
  appName: 'budget',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    appendUserAgent: 'Budget Android',
  },
  plugins: {
    Keyboard: {
      resize: true,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_notifications",
      iconColor: "#488AFF",
      sound: "beep.wav",
      actionTypeId: 'REMINDER_ACTION'
    }
  },
};

export default config;
