export interface iMessage {
  text: string;
  date: string;
  is_from_me: boolean;
  contact: string;
}

export async function getRecentMessages(daysBack = 7): Promise<iMessage[]> {
  // Return empty array - message extraction disabled
  return [];
}

export function prepareMessagesForPrompt(messages: iMessage[]): string {
  if (!messages || messages.length === 0) {
    return '';
  }

  // Group recent messages by conversation and anonymize contacts
  const conversations: { [key: string]: any[] } = {};
  const contactMap: { [key: string]: string } = {};
  let contactCounter = 1;

  for (const msg of messages) {
    const contact = msg.contact;
    if (!(contact in contactMap)) {
      contactMap[contact] = `Contact_${contactCounter}`;
      contactCounter++;
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

  // Format recent conversations for prompt context
  let contextText = 'Recent message activity:\n';

  for (const [contact, msgs] of Object.entries(conversations)) {
    if (msgs.length > 0) {
      contextText += `\n${contact}: ${msgs.length} messages\n`;
      // Include a sample of recent messages for context
      const recentSample = msgs.slice(0, 3);
      for (const msg of recentSample) {
        const sender = msg.from_user ? 'User' : contact;
        contextText += `  ${sender}: ${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''}\n`;
      }
    }
  }

  return contextText;
}