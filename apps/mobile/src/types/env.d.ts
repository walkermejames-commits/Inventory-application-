/** Expo public env vars available at build time. */
declare const process: {
  env: {
    EXPO_PUBLIC_ADMIN_API_URL?: string;
    EXPO_PUBLIC_DEMO_DRIVER_ID?: string;
    EXPO_PUBLIC_MOBILE_API_KEY?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_MOBILE_DEEP_LINK_URL?: string;
    [key: string]: string | undefined;
  };
};
