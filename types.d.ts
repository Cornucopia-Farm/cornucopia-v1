import type { DefaultUser, Profile } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultUser & {
      login: string;
      url: string;
    };
  }
};

declare module 'next-auth/jwt/types' {
  interface JWT {
    profile: Profile & {
        login: string;
        html_url: string;
    }
  }
};

declare module 'next-auth/profile/types' {
    interface Profile {
      profile: Profile & {
          login: string;
          html_url: string;
      }
    }
  };