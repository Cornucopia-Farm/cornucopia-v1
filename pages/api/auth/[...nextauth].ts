import NextAuth from 'next-auth';
import type { NextAuthOptions, Profile } from 'next-auth'
import GithubProvider from 'next-auth/providers/github';
import TwitterProvider from 'next-auth/providers/twitter';

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    // TwitterProvider({
    //     clientId: process.env.TWITTER_CLIENT_ID!,
    //     clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    // }),
  ],
  pages: {
    error: '/openBounties',
    signOut: '/openBounties'
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account) {
        token.login = profile?.login;
        token.url = profile?.html_url;
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a provider.
      session.user.login = String(token.login);
      session.user.url = String(token.url);
      
      return session
    }
  }
};

export default NextAuth(authOptions);