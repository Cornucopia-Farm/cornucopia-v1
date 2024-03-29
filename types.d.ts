import type { DefaultUser, Profile } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultUser & {
      login?: string;
      url?: string;
      username?: string;
      twitter_url?: string;
    };
  };
  interface Profile extends Profile {
      login: string;
      html_url: string;
      username: string;
  };
};




