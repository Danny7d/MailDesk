import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth';

const handler = NextAuth(authConfig);

export const { auth, signIn, signOut } = handler;
export default handler;
