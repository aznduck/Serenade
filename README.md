# iMessage Analyzer

Analyzes your local iMessages to generate narrative summaries and extract key events using LLM APIs.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up API keys (choose one):
```bash
# For OpenAI
export OPENAI_API_KEY="your-key-here"

# For Anthropic Claude
export ANTHROPIC_API_KEY="your-key-here"
```

3. Grant Terminal "Full Disk Access" in System Preferences > Security & Privacy > Privacy

## Usage

```bash
# Basic usage (analyzes last 30 days with OpenAI)
python imessage_analyzer.py

# Analyze last 7 days with Anthropic
python imessage_analyzer.py --days 7 --api anthropic

# Analyze last 60 days with OpenAI
python imessage_analyzer.py --days 60 --api openai
```

## Privacy

- Runs entirely on your local machine
- Anonymizes contacts before sending to LLM
- Requires explicit user consent
- No data stored or transmitted elsewhere