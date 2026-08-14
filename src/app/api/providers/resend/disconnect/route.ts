import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the Resend connection
    await prisma.connectedProvider.deleteMany({
      where: {
        userId: session.user.id,
        provider: 'resend',
      },
    });

    return NextResponse.json({ message: 'Resend disconnected successfully' });
  } catch (error) {
    console.error('Resend disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Resend' },
      { status: 500 }
    );
  }
}
