export interface iMessage {
  text: string;
  date: string;
  is_from_me: boolean;
  contact: string;
}

export async function getRecentMessages(daysBack = 7): Promise<iMessage[]> {
  console.log(`[iMessage] Starting message extraction for last ${daysBack} days`);

  // Return empty array - message extraction disabled
  console.log('[iMessage] Message extraction disabled - returning empty array');
  return [];
}

export function prepareMessagesForPrompt(messages: iMessage[]): string {
  console.log(`[iMessage] Preparing ${messages ? messages.length : 0} messages for prompt`);

  if (!messages || messages.length === 0) {
    console.log('[iMessage] No messages to process - returning empty string');
    return '';
  }

  // Group recent messages by conversation and anonymize contacts
  console.log('[iMessage] Grouping messages by contact and anonymizing');
  const conversations: { [key: string]: any[] } = {};
  const contactMap: { [key: string]: string } = {};
  let contactCounter = 1;

  for (const msg of messages) {
    const contact = msg.contact;
    if (!(contact in contactMap)) {
      contactMap[contact] = `Contact_${contactCounter}`;
      contactCounter++;
      console.log(`[iMessage] Added new contact: ${contact} -> Contact_${contactCounter - 1}`);
    }

    const anonymousContact = contactMap[contact];
    if (!(anonymousContact in conversations)) {
      conversations[anonymousContact] = [];
    }

    conversations[anonymousContact].push({
      text: msg.text,
      from_user: msg.is_from_me
    });
  }

  console.log(`[iMessage] Processed messages for ${Object.keys(conversations).length} unique contacts`);

  // Format recent conversations for prompt context
  console.log('[iMessage] Formatting conversations for prompt context');
  let contextText = 'Recent message activity:\n';
  let totalMessages = 0;

  for (const [contact, msgs] of Object.entries(conversations)) {
    if (msgs.length > 0) {
      totalMessages += msgs.length;
      contextText += `\n${contact}: ${msgs.length} messages\n`;
      console.log(`[iMessage] Processing ${msgs.length} messages for ${contact}`);

      // Include a sample of recent messages for context
      const recentSample = msgs.slice(0, 3);
      for (const msg of recentSample) {
        const sender = msg.from_user ? 'User' : contact;
        contextText += `  ${sender}: ${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''}\n`;
      }
    }
  }

  console.log(`[iMessage] Formatted context with ${totalMessages} total messages from ${Object.keys(conversations).length} contacts`);
  console.log(`[iMessage] Context text length: ${contextText.length} characters`);

  return contextText;
}