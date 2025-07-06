// src/app/api/cron/send-reminders/route.ts
import { NextResponse } from 'next/server';
import { sendDailyReminders } from '@/ai/flows/send-reminders-flow';

// This is the secret that the cron job will send to authenticate itself.
// It MUST be set in your environment variables.
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Check for the secret in the request headers
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await sendDailyReminders();
    if (!result.success) {
      console.error('Cron job for reminders failed:', result.errors.join('; '));
      return NextResponse.json({ success: false, ...result }, { status: 500 });
    }
    console.log('Cron job for reminders executed successfully.', result);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron job for reminders encountered an unhandled exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
