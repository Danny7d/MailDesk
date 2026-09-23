import NextAuth from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authConfig } from '@/lib/auth';

const handler = NextAuth(authConfig);

// next-auth v4 does not return { auth, signIn, signOut } from NextAuth() the
// way v5 (Auth.js) does — that destructure silently produced `undefined`,
// so every server component/route calling `auth()` threw at runtime right
// after login. Wrap getServerSession so the rest of the app's `auth()`
// call sites keep working without touching every consumer.
export function auth() {
  return getServerSession(authConfig);
}

export default handler;
