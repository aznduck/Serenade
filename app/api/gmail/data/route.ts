import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log('[Gmail] Starting Gmail data fetch request');
    const { accessToken } = await request.json();

    if (!accessToken) {
      console.error('[Gmail] Access token missing from request');
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    console.log('[Gmail] Access token received, proceeding with Gmail API calls');

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Get list of recent messages (last 2 weeks)
    console.log('[Gmail] Fetching message list from Gmail API (last 14 days, max 20 results)');
    const messagesResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox newer_than:14d',
      { headers }
    );

    if (!messagesResponse.ok) {
      console.error(`[Gmail] Gmail API error - Messages list failed: ${messagesResponse.status} ${messagesResponse.statusText}`);
      return NextResponse.json(
        { error: "Failed to fetch Gmail messages" },
        { status: 400 }
      );
    }

    console.log(`[Gmail] Successfully fetched message list (status: ${messagesResponse.status})`);

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];

    console.log(`[Gmail] Received ${messages.length} messages from API`);

    // Fetch details for each message (subjects only)
    console.log('[Gmail] Fetching detailed metadata for first 10 messages');
    const messageDetails = await Promise.all(
      messages.slice(0, 10).map(async (message: any, index: number) => {
        try {
          console.log(`[Gmail] Fetching details for message ${index + 1}/${Math.min(messages.length, 10)} (ID: ${message.id})`);

          const detailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
            { headers }
          );

          if (detailResponse.ok) {
            console.log(`[Gmail] Successfully fetched details for message ${index + 1}`);
            const detail = await detailResponse.json();
            const headers = detail.payload?.headers || [];

            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';

            console.log(`[Gmail] Message ${index + 1} - Subject: "${subject.substring(0, 50)}..." From: "${from.substring(0, 30)}..."`);

            return { subject, from };
          } else {
            console.warn(`[Gmail] Failed to fetch details for message ${index + 1}: ${detailResponse.status}`);
          }
          return null;
        } catch (error) {
          console.error(`[Gmail] Error fetching message ${index + 1} details:`, error);
          return null;
        }
      })
    );

    // Filter out null results and format for Claude
    const emailData = messageDetails
      .filter(detail => detail !== null)
      .map(detail => detail!)
      .slice(0, 10); // Limit to 10 recent emails

    console.log(`[Gmail] Successfully processed ${emailData.length} email messages`);
    console.log('[Gmail] Email processing summary:');
    emailData.forEach((email, index) => {
      console.log(`[Gmail]   ${index + 1}. Subject: "${email.subject.substring(0, 40)}..."`);
    });

    console.log(`[Gmail] Returning successful response with ${emailData.length} emails`);

    return NextResponse.json({
      success: true,
      data: {
        recentEmails: emailData,
        count: emailData.length
      }
    });
  } catch (error) {
    console.error("[Gmail] Gmail data fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}