import { NextResponse } from 'next/server';
import { getConfig, getGifts, markReminderSent } from '@/lib/db';
import { sendEmail, getReminderEmailHtml } from '@/lib/email';

export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV === 'development';
  const authHeader = request.headers.get('authorization');

  // Verify cron secret in production
  if (!isDev && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getConfig();
    if (!config.date) {
      return NextResponse.json({ message: 'No event date configured. Reminders skipped.' });
    }

    // Parse event date (expected format YYYY-MM-DD)
    const eventDate = new Date(`${config.date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate difference in days
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Send reminders if event is within 14 days (between 1 and 14 days away)
    if (diffDays <= 0 || diffDays > 14) {
      return NextResponse.json({ 
        message: `Event is in ${diffDays} days. Reminders are only sent when the event is 1 to 14 days away.`, 
        diffDays 
      });
    }

    // Fetch all reserved gifts that haven't received reminders yet
    const gifts = await getGifts();
    const pendingGifts = gifts.filter(
      g => g.reservedBy && g.reservedEmail && !g.reminderSent
    );

    if (pendingGifts.length === 0) {
      return NextResponse.json({ message: 'No pending reminders to send.' });
    }

    // Group gifts by guest email to send a single consolidated email
    const groupedByEmail: { [email: string]: { guestName: string; giftIds: string[]; itemNames: string[] } } = {};

    pendingGifts.forEach(g => {
      const email = g.reservedEmail!.trim().toLowerCase();
      if (!groupedByEmail[email]) {
        groupedByEmail[email] = {
          guestName: g.reservedBy!,
          giftIds: [],
          itemNames: [],
        };
      }
      groupedByEmail[email].giftIds.push(g.id);
      groupedByEmail[email].itemNames.push(g.name);
    });

    const results = [];
    const eventDetails = {
      date: config.date,
      time: config.time || 'Por definir',
      location: config.locationName ? `${config.locationName} (${config.locationAddress})` : config.locationAddress || 'Por definir',
      mapUrl: config.locationMapUrl || undefined,
    };

    // Send consolidated emails
    for (const [email, group] of Object.entries(groupedByEmail)) {
      const subject = 'Recordatorio: ¡Falta muy poco para el Baby Shower! 👶';
      const html = getReminderEmailHtml(group.guestName, group.itemNames, eventDetails);

      const success = await sendEmail(email, subject, html);
      if (success) {
        // Mark all these gifts as reminderSent in the database
        await Promise.all(group.giftIds.map(id => markReminderSent(id)));
        results.push({ email, guestName: group.guestName, status: 'Sent', items: group.itemNames });
      } else {
        results.push({ email, guestName: group.guestName, status: 'Failed' });
      }
    }

    return NextResponse.json({
      message: `Processed reminders for ${pendingGifts.length} items.`,
      daysToEvent: diffDays,
      results,
    });
  } catch (error) {
    console.error('Error running reminders cron:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
