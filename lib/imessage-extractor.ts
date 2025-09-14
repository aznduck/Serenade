export interface iMessage {
  text: string;
  date: string;
  is_from_me: boolean;
  contact: string;
}

export async function getRecentMessages(daysBack = 7): Promise<iMessage[]> {
  console.log(`[iMessage] Starting message extraction for last ${daysBack} days`);

  try {
    const Database = (await import('better-sqlite3')).default;
    const path = await import('path');
    const os = await import('os');
    const fs = await import('fs');

    // Path to the Messages database on macOS
    const homeDir = os.homedir();
    const dbPath = path.join(homeDir, 'Library', 'Messages', 'chat.db');

    console.log(`[iMessage] Attempting to access database at: ${dbPath}`);
    console.log(`[iMessage] Home directory: ${homeDir}`);

    // Check if the file exists and is readable
    try {
      const stats = fs.statSync(dbPath);
      console.log(`[iMessage] Database file found, size: ${stats.size} bytes, modified: ${stats.mtime}`);

      // Test read access
      fs.accessSync(dbPath, fs.constants.R_OK);
      console.log(`[iMessage] Database file is readable`);
    } catch (accessError) {
      console.error(`[iMessage] Database file access check failed:`, accessError);
      throw new Error(`Cannot access Messages database. This may be due to macOS security permissions. Please ensure the app has Full Disk Access in System Preferences > Security & Privacy > Privacy > Full Disk Access.`);
    }

    console.log(`[iMessage] Opening database connection...`);
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });

    // Calculate timestamp for N days back (Apple's timestamp is nanoseconds since 2001-01-01)
    const appleEpoch = new Date('2001-01-01').getTime() / 1000; // seconds
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffTimestamp = Math.floor((cutoffDate.getTime() / 1000 - appleEpoch) * 1000000000); // convert to nanoseconds

    console.log(`[iMessage] Looking for messages since timestamp: ${cutoffTimestamp} (${daysBack} days ago)`);

    // Query to get recent messages with contact info
    const query = `
      SELECT
        m.text,
        m.date,
        m.is_from_me,
        CASE
          WHEN h.id LIKE '%@%' THEN h.id
          WHEN h.id LIKE '+%' THEN h.id
          ELSE COALESCE(h.id, 'Unknown')
        END as contact_id
      FROM message m
      JOIN chat_message_join cmj ON m.ROWID = cmj.message_id
      JOIN chat c ON cmj.chat_id = c.ROWID
      JOIN handle h ON m.handle_id = h.ROWID
      WHERE m.date > ?
        AND m.text IS NOT NULL
        AND m.text != ''
      ORDER BY m.date DESC
      LIMIT 1000
    `;

    console.log(`[iMessage] Executing database query...`);
    const rows = db.prepare(query).all(cutoffTimestamp);

    console.log(`[iMessage] Database query returned ${rows.length} raw messages`);

    const messages: iMessage[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as {
        text: string;
        date: number;
        is_from_me: number;
        contact_id: string;
      };

      // Convert Apple's nanosecond timestamp to JavaScript Date
      const messageDate = new Date(row.date / 1000000000 * 1000 + appleEpoch * 1000);

      const message: iMessage = {
        text: row.text,
        date: messageDate.toISOString(),
        is_from_me: Boolean(row.is_from_me),
        contact: row.contact_id
      };

      messages.push(message);

      // Log every 100th message to avoid spam, plus first and last few
      if (i < 5 || i >= rows.length - 5 || (i + 1) % 100 === 0) {
        console.log(`[iMessage] Retrieved message ${i + 1}/${rows.length}: ${message.is_from_me ? 'FROM' : 'TO'} ${message.contact} at ${message.date} - "${message.text.substring(0, 50)}${message.text.length > 50 ? '...' : ''}"`);
      }
    }

    db.close();
    console.log(`[iMessage] Database closed. Successfully extracted ${messages.length} messages from last ${daysBack} days`);

    return messages;

  } catch (error: any) {
    console.error('[iMessage] Error extracting messages:', error);

    if (error.code === 'SQLITE_CANTOPEN') {
      console.error('[iMessage] Database cannot be opened - likely a permissions issue');
      console.error('[iMessage] To fix: Grant "Full Disk Access" to your terminal/Node.js in System Preferences > Security & Privacy > Privacy > Full Disk Access');
    } else if (error.code === 'ENOENT') {
      console.error('[iMessage] Messages database file not found - Messages app may not be configured or used on this system');
    } else if (error.message && error.message.includes('permission')) {
      console.error('[iMessage] Permission denied accessing Messages database');
    }

    console.log('[iMessage] Falling back to empty array due to database error');
    return [];
  }
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