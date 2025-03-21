import { Filesystem } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

export const checkAndRequestPermissions = async () => {
  if (!Capacitor.isNativePlatform()) return true;
  
  try {
    const permissions = await Filesystem.checkPermissions();
    if (permissions.publicStorage !== 'granted') {
      await Filesystem.requestPermissions();
    }
    return true;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
};
