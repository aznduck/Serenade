import { NextResponse } from "next/server";
import { getRecentMessages } from '@/lib/imessage-extractor';

export async function POST() {
  try {
    console.log('[iMessage API] Starting iMessage data extraction');

    // Extract recent messages (last 7 days)
    const messages = await getRecentMessages(7);
    console.log(`[iMessage API] Retrieved ${messages.length} messages`);

    if (messages.length === 0) {
      console.log('[iMessage API] No messages found - returning empty data');
      return NextResponse.json({
        success: true,
        data: {
          messages: [],
          count: 0,
          preview: [],
          summary: 'No recent messages found'
        }
      });
    }

    // Group messages by contact for preview
    const contactGroups: { [key: string]: typeof messages } = {};
    const contactMap: { [key: string]: string } = {};
    let contactCounter = 1;

    for (const msg of messages) {
      const contact = msg.contact;
      if (!(contact in contactMap)) {
        contactMap[contact] = `Contact_${contactCounter}`;
        contactCounter++;
      }

      const anonymousContact = contactMap[contact];
      if (!(anonymousContact in contactGroups)) {
        contactGroups[anonymousContact] = [];
      }
      contactGroups[anonymousContact].push(msg);
    }

    // Create preview array showing contact activity
    const preview = Object.entries(contactGroups).map(([contact, msgs]) =>
      `${contact}: ${msgs.length} messages`
    );

    const summary = `Processed ${messages.length} messages from ${Object.keys(contactGroups).length} contacts`;

    console.log(`[iMessage API] Successfully processed messages: ${summary}`);

    return NextResponse.json({
      success: true,
      data: {
        messages,
        count: messages.length,
        preview,
        summary,
        contactCount: Object.keys(contactGroups).length
      }
    });

  } catch (error: unknown) {
    console.error('[iMessage API] Error extracting iMessage data:', error);

    // Return a graceful error response - don't fail the entire flow
    return NextResponse.json({
      success: false,
      data: {
        messages: [],
        count: 0,
        preview: [],
        summary: `Error accessing messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}