# iMessage Analyzer

A privacy-focused tool that analyzes local iMessages to generate narrative summaries and extract key events using LLM APIs. Designed for integration with larger applications.

## Overview

This tool accesses macOS's Messages database (`~/Library/Messages/chat.db`) to extract and analyze user conversations. It provides:

- **Narrative Summaries**: 300-word general life/activity summaries
- **Key Events Extraction**: Notable moments and one-off events
- **Privacy Protection**: Contact anonymization and user consent
- **Flexible API Support**: OpenAI GPT-4 and Anthropic Claude integration

## Prerequisites

### System Requirements
- **macOS only** (requires access to Messages database)
- **Python 3.7+**
- **Terminal with Full Disk Access**

### API Requirements
- OpenAI API key OR Anthropic Claude API key
- Active API credits/tokens

## Installation & Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Grant System Permissions
1. Open **System Preferences** → **Security & Privacy** → **Privacy**
2. Select **Full Disk Access** from the left sidebar
3. Click the lock icon and authenticate
4. Click **+** and add your Terminal application
5. Restart Terminal

### 3. Configure API Keys
Choose one API provider:

**Option A: Anthropic Claude (Recommended)**
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Option B: OpenAI GPT-4**
```bash
export OPENAI_API_KEY="sk-..."
```

## Usage

### Standalone Usage
```bash
# Basic usage (30 days, Claude API, with consent prompt)
python3 imessage_analyzer.py

# Auto-consent for automation (skip prompt)
python3 imessage_analyzer.py --consent

# Analyze different time periods
python3 imessage_analyzer.py --days 7 --consent    # Last week
python3 imessage_analyzer.py --days 90 --consent   # Last 3 months

# Use different API providers
python3 imessage_analyzer.py --api openai --consent
python3 imessage_analyzer.py --api anthropic --consent
```

### Programmatic Integration

```python
from imessage_analyzer import iMessageAnalyzer

# Initialize analyzer
analyzer = iMessageAnalyzer(
    days_back=30,
    api_provider="anthropic",  # or "openai"
    auto_consent=True  # Skip consent prompt for automation
)

# Run analysis
try:
    # Extract messages
    messages = analyzer.get_recent_messages()

    # Analyze with LLM
    narrative, key_events = analyzer.analyze_messages(messages)

    print(f"Narrative: {narrative}")
    print(f"Key Events: {key_events}")

except Exception as e:
    print(f"Analysis failed: {e}")
```

## Integration Guide

### For Your Main Application

1. **Add as Submodule/Dependency**:
   ```bash
   # Copy files to your project
   cp imessage_analyzer.py your_project/
   cp requirements.txt your_project/

   # Or add as git submodule
   git submodule add https://github.com/aznduck/Serenade.git
   ```

2. **Environment Setup**:
   ```python
   import os

   # Set API key programmatically
   os.environ['ANTHROPIC_API_KEY'] = 'your-key-here'

   from imessage_analyzer import iMessageAnalyzer
   ```

3. **Error Handling**:
   ```python
   def safe_analyze_messages(days=30):
       try:
           analyzer = iMessageAnalyzer(days_back=days, auto_consent=True)

           # Check database access first
           if not analyzer.check_database_access():
               return {"error": "Cannot access Messages database"}

           messages = analyzer.get_recent_messages()
           if not messages:
               return {"error": "No messages found"}

           narrative, events = analyzer.analyze_messages(messages)
           return {
               "success": True,
               "narrative": narrative,
               "key_events": events,
               "message_count": len(messages)
           }

       except Exception as e:
           return {"error": str(e)}
   ```

4. **Background Processing**:
   ```python
   import threading

   def analyze_in_background(callback):
       def worker():
           result = safe_analyze_messages()
           callback(result)

       thread = threading.Thread(target=worker)
       thread.daemon = True
       thread.start()
   ```

## API Reference

### Class: `iMessageAnalyzer`

#### Constructor
```python
iMessageAnalyzer(days_back=30, api_provider="anthropic", auto_consent=False)
```

**Parameters:**
- `days_back` (int): Number of days to analyze (default: 30)
- `api_provider` (str): "openai" or "anthropic" (default: "anthropic")
- `auto_consent` (bool): Skip consent prompt (default: False)

#### Key Methods

**`get_recent_messages() -> List[Dict]`**
- Extracts messages from database
- Returns list of message dictionaries
- Handles timestamp conversion and error cases

**`analyze_messages(messages) -> Tuple[str, List[str]]`**
- Analyzes messages with LLM
- Returns (narrative_summary, key_events_list)
- Automatically handles contact anonymization

**`check_database_access() -> bool`**
- Verifies Messages database accessibility
- Returns True if database can be opened

## Privacy & Security

### Data Handling
- **Local Processing**: All database access happens locally
- **Contact Anonymization**: Phone numbers/emails become "Contact_1", "Contact_2", etc.
- **No Storage**: No permanent storage of user messages
- **Consent Required**: Explicit user permission before processing

### API Data Transmission
- Only anonymized message content sent to LLM APIs
- No personally identifiable information transmitted
- Limited to last N messages per contact (20 max)
- Timestamps removed from API requests

### Security Considerations
- API keys stored in environment variables only
- No hardcoded credentials in source code
- Database opened in read-only mode
- Graceful handling of permission errors

## Troubleshooting

### Common Issues

**"iMessages database not found"**
- Ensure you're running on macOS
- Verify Messages app is set up and has been used

**"Cannot access iMessages database"**
- Grant Terminal "Full Disk Access" in System Preferences
- Restart Terminal after granting permissions
- Try running with `sudo` (not recommended for production)

**"Model not found" errors**
- Check API key is correctly set
- Verify API credits/quota
- Try different model (Haiku vs Sonnet vs GPT-4)

**"No messages found"**
- Increase `days_back` parameter
- Check if Messages database has recent activity
- Verify timestamp calculation with `sqlite3 ~/Library/Messages/chat.db "SELECT COUNT(*) FROM message;"`

## Integration Examples

### Flask Web API
```python
from flask import Flask, jsonify
from imessage_analyzer import iMessageAnalyzer

app = Flask(__name__)

@app.route('/analyze')
def analyze_messages():
    analyzer = iMessageAnalyzer(auto_consent=True)
    messages = analyzer.get_recent_messages()
    narrative, events = analyzer.analyze_messages(messages)

    return jsonify({
        'narrative': narrative,
        'key_events': events,
        'message_count': len(messages)
    })
```

### CLI Integration
```python
import click
from imessage_analyzer import iMessageAnalyzer

@click.command()
@click.option('--days', default=30, help='Days to analyze')
@click.option('--output', type=click.File('w'), help='Output file')
def analyze(days, output):
    analyzer = iMessageAnalyzer(days_back=days, auto_consent=True)
    messages = analyzer.get_recent_messages()
    narrative, events = analyzer.analyze_messages(messages)

    result = {
        'narrative': narrative,
        'key_events': events
    }

    if output:
        json.dump(result, output, indent=2)
    else:
        click.echo(json.dumps(result, indent=2))
```

## Development

### Testing
```bash
# Test database access
python3 -c "from imessage_analyzer import iMessageAnalyzer; print(iMessageAnalyzer().check_database_access())"

# Test API connectivity
python3 -c "import anthropic; client = anthropic.Anthropic(); print('API OK')"
```

### Extending Functionality
- Modify `prepare_messages_for_analysis()` for custom formatting
- Add new LLM providers by implementing `analyze_with_[provider]()`
- Extend message filtering in `get_recent_messages()`

## License & Credits

Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>