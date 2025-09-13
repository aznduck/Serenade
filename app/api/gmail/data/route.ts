import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Get list of recent messages (last 2 weeks)
    const messagesResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox newer_than:14d',
      { headers }
    );

    if (!messagesResponse.ok) {
      console.error("Gmail messages list error:", messagesResponse.status);
      return NextResponse.json(
        { error: "Failed to fetch Gmail messages" },
        { status: 400 }
      );
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.messages || [];

    // Fetch details for each message (subjects only)
    const messageDetails = await Promise.all(
      messages.slice(0, 10).map(async (message: any) => {
        try {
          const detailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
            { headers }
          );

          if (detailResponse.ok) {
            const detail = await detailResponse.json();
            const headers = detail.payload?.headers || [];

            const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';

            return { subject, from };
          }
          return null;
        } catch (error) {
          console.error("Error fetching message details:", error);
          return null;
        }
      })
    );

    // Filter out null results and format for Claude
    const emailData = messageDetails
      .filter(detail => detail !== null)
      .map(detail => detail!)
      .slice(0, 10); // Limit to 10 recent emails

    return NextResponse.json({
      success: true,
      data: {
        recentEmails: emailData,
        count: emailData.length
      }
    });
  } catch (error) {
    console.error("Gmail data fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}