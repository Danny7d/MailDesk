import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

function generateInboundAddress(username: string): string {
  const inboundDomain = process.env.MAILDESK_INBOUND_DOMAIN;
  if (!inboundDomain) {
    throw new Error('MAILDESK_INBOUND_DOMAIN environment variable is not configured');
  }

  // Generate a unique local part using crypto
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const localPart = `${username}-${randomSuffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  return `${localPart}@${inboundDomain}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
      },
    });

    // Generate inbound email address
    const username = validatedData.name || validatedData.email.split('@')[0];
    const inboundAddress = generateInboundAddress(username);
    const inboundDomain = process.env.MAILDESK_INBOUND_DOMAIN!;

    // Check if email address already exists (unlikely but possible due to collision)
    const existingAddress = await prisma.emailAddress.findUnique({
      where: { email: inboundAddress },
    });

    if (existingAddress) {
      // Regenerate with a different suffix
      const newInboundAddress = generateInboundAddress(username);
      await prisma.emailAddress.create({
        data: {
          userId: user.id,
          email: newInboundAddress,
          domain: inboundDomain,
          verified: true,
        },
      });
    } else {
      // Create EmailAddress record
      await prisma.emailAddress.create({
        data: {
          userId: user.id,
          email: inboundAddress,
          domain: inboundDomain,
          verified: true,
        },
      });
    }

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          inboundAddress,
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Signup error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
