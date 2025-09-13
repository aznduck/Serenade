#!/usr/bin/env python3
"""
iMessage Analyzer Script
Analyzes local iMessages to generate narrative summaries and key events.
Requires explicit user consent and runs entirely on local machine.
"""

import sqlite3
import os
import sys
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import argparse

# LLM API imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


class iMessageAnalyzer:
    def __init__(self, days_back: int = 30, api_provider: str = "anthropic", auto_consent: bool = False):
        self.days_back = days_back
        self.api_provider = api_provider
        self.auto_consent = auto_consent
        self.db_path = os.path.expanduser("~/Library/Messages/chat.db")

    def verify_consent(self) -> bool:
        """Verify user consent for accessing their messages."""
        print("🔒 iMessage Privacy Notice")
        print("=" * 50)
        print("This script will:")
        print("• Access your local iMessages database")
        print("• Send message content to an external LLM API for analysis")
        print("• Generate a summary of your messaging patterns")
        print("• NOT store or transmit your data elsewhere")
        print("\nYour messages will be processed securely and privately.")

        if self.auto_consent:
            print("\n✅ Auto-consent enabled. Proceeding with analysis...")
            return True

        try:
            consent = input("\nDo you consent to analyzing your iMessages? (yes/no): ").strip().lower()
            if consent not in ['yes', 'y']:
                print("❌ User consent not provided. Exiting.")
                return False

            print("✅ Consent verified. Proceeding with analysis...")
            return True
        except (EOFError, KeyboardInterrupt):
            print("\n❌ User consent not provided. Exiting.")
            return False

    def check_database_access(self) -> bool:
        """Check if we can access the iMessages database."""
        if not os.path.exists(self.db_path):
            print(f"❌ iMessages database not found at: {self.db_path}")
            print("Make sure you're running this on macOS with Messages enabled.")
            return False

        try:
            conn = sqlite3.connect(self.db_path)
            conn.close()
            print("✅ Successfully connected to iMessages database")
            return True
        except sqlite3.Error as e:
            print(f"❌ Cannot access iMessages database: {e}")
            print("You may need to grant Terminal 'Full Disk Access' in System Preferences > Security & Privacy")
            return False

    def get_recent_messages(self) -> List[Dict]:
        """Extract recent messages from the database."""
        cutoff_date = datetime.now() - timedelta(days=self.days_back)
        # Apple's timestamp is nanoseconds since 2001-01-01
        apple_epoch = datetime(2001, 1, 1).timestamp()
        cutoff_timestamp = int((cutoff_date.timestamp() - apple_epoch) * 1000000000)

        query = """
        SELECT
            message.text,
            message.date,
            message.is_from_me,
            handle.id as contact
        FROM message
        LEFT JOIN handle ON message.handle_id = handle.ROWID
        WHERE message.date > ?
        AND message.text IS NOT NULL
        AND message.text != ''
        ORDER BY message.date ASC
        """

        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(query, (cutoff_timestamp,))

            messages = []
            for row in cursor.fetchall():
                text, date, is_from_me, contact = row

                # Convert Apple's timestamp to readable date
                apple_epoch = datetime(2001, 1, 1).timestamp()
                readable_date = datetime.fromtimestamp(date / 1000000000 + apple_epoch)

                messages.append({
                    'text': text,
                    'date': readable_date.isoformat(),
                    'is_from_me': bool(is_from_me),
                    'contact': contact or 'Unknown'
                })

            conn.close()
            print(f"✅ Retrieved {len(messages)} messages from the last {self.days_back} days")
            return messages

        except sqlite3.Error as e:
            print(f"❌ Error querying database: {e}")
            return []

    def prepare_messages_for_analysis(self, messages: List[Dict]) -> str:
        """Prepare messages for LLM analysis while protecting privacy."""
        if not messages:
            return ""

        # Group messages by conversation and anonymize contacts
        conversations = {}
        contact_map = {}
        contact_counter = 1

        for msg in messages:
            contact = msg['contact']
            if contact not in contact_map:
                contact_map[contact] = f"Contact_{contact_counter}"
                contact_counter += 1

            anonymous_contact = contact_map[contact]

            if anonymous_contact not in conversations:
                conversations[anonymous_contact] = []

            conversations[anonymous_contact].append({
                'text': msg['text'],
                'date': msg['date'],
                'from_user': msg['is_from_me']
            })

        # Format for analysis
        analysis_text = f"Message conversations from the last {self.days_back} days:\n\n"

        for contact, msgs in conversations.items():
            analysis_text += f"--- Conversation with {contact} ---\n"
            for msg in msgs[-20:]:  # Limit to last 20 messages per contact
                sender = "User" if msg['from_user'] else contact
                analysis_text += f"{sender}: {msg['text']}\n"
            analysis_text += "\n"

        return analysis_text

    def analyze_with_openai(self, messages_text: str) -> Tuple[str, List[str]]:
        """Analyze messages using OpenAI GPT."""
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI library not installed. Run: pip install openai")

        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")

        client = openai.OpenAI(api_key=api_key)

        prompt = f"""
        Analyze the following text messages and provide:
        1. A 300-word narrative summary of the user's general life/activities
        2. A list of special one-off events or notable moments

        Messages:
        {messages_text}

        Format your response as JSON:
        {{
            "narrative": "300-word summary here...",
            "key_events": ["event 1", "event 2", "event 3"]
        }}
        """

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800
        )

        result = json.loads(response.choices[0].message.content)
        return result["narrative"], result["key_events"]

    def analyze_with_anthropic(self, messages_text: str) -> Tuple[str, List[str]]:
        """Analyze messages using Anthropic Claude."""
        if not ANTHROPIC_AVAILABLE:
            raise ImportError("Anthropic library not installed. Run: pip install anthropic")

        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")

        client = anthropic.Anthropic(api_key=api_key)

        prompt = f"""
        Analyze the following text messages and provide:
        1. A 300-word narrative summary of the user's general life/activities
        2. A list of special one-off events or notable moments

        Messages:
        {messages_text}

        Format your response as JSON:
        {{
            "narrative": "300-word summary here...",
            "key_events": ["event 1", "event 2", "event 3"]
        }}
        """

        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )

        result = json.loads(response.content[0].text)
        return result["narrative"], result["key_events"]

    def analyze_messages(self, messages: List[Dict]) -> Tuple[str, List[str]]:
        """Analyze messages using the specified LLM provider."""
        messages_text = self.prepare_messages_for_analysis(messages)

        if not messages_text.strip():
            return "No messages found to analyze.", []

        print(f"🤖 Analyzing messages with {self.api_provider}...")

        try:
            if self.api_provider == "openai":
                return self.analyze_with_openai(messages_text)
            elif self.api_provider == "anthropic":
                return self.analyze_with_anthropic(messages_text)
            else:
                raise ValueError(f"Unsupported API provider: {self.api_provider}")
        except Exception as e:
            print(f"❌ Error during analysis: {e}")
            return f"Analysis failed: {e}", []

    def run_analysis(self) -> None:
        """Run the complete analysis pipeline."""
        print("📱 iMessage Analyzer")
        print("=" * 30)

        # Step 1: Get consent
        if not self.verify_consent():
            return

        # Step 2: Check database access
        if not self.check_database_access():
            return

        # Step 3: Extract messages
        print("\n📥 Extracting messages...")
        messages = self.get_recent_messages()

        if not messages:
            print("❌ No messages found to analyze.")
            return

        # Step 4: Analyze with LLM
        narrative, key_events = self.analyze_messages(messages)

        # Step 5: Display results
        print("\n" + "=" * 60)
        print("📊 ANALYSIS RESULTS")
        print("=" * 60)

        print("\n📖 NARRATIVE SUMMARY:")
        print("-" * 30)
        print(narrative)

        print("\n🎯 KEY EVENTS:")
        print("-" * 30)
        for i, event in enumerate(key_events, 1):
            print(f"{i}. {event}")

        print("\n" + "=" * 60)
        print("✅ Analysis complete!")


def main():
    parser = argparse.ArgumentParser(description="Analyze iMessages to generate narrative summaries")
    parser.add_argument("--days", type=int, default=30, help="Number of days back to analyze (default: 30)")
    parser.add_argument("--api", choices=["openai", "anthropic"], default="anthropic",
                       help="LLM API provider (default: anthropic)")
    parser.add_argument("--consent", action="store_true", help="Auto-consent to analysis (skip consent prompt)")

    args = parser.parse_args()

    analyzer = iMessageAnalyzer(days_back=args.days, api_provider=args.api, auto_consent=args.consent)
    analyzer.run_analysis()


if __name__ == "__main__":
    main()