
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fe4eb58183b6467d905d54c156eebd24',
  appName: 'Collowop',
  webDir: 'dist',
  server: {
    url: 'https://fe4eb581-83b6-467d-905d-54c156eebd24.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      spinnerColor: "#00af6b",
      androidSplashResourceName: "splash"
    }
  },
  android: {
    backgroundColor: "#ffffff"
  },
  ios: {
    backgroundColor: "#ffffff"
  }
};

export default config;
