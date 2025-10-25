import os
import logging
from anthropic import Anthropic

# Configure logging for this module
logger = logging.getLogger(__name__)


def summarize_commits(commit_messages: list[str]) -> str:
    """
    Use Claude 4.5 Haiku to summarize commit messages into a "build in public" style post.
    
    Args:
        commit_messages: List of commit messages from the push event
        
    Returns:
        A concise, casual, and engaging summary suitable for social posting
    """
    logger.info(f"Starting commit summarization for {len(commit_messages)} commits")
    
    # Log commit messages for debugging
    logger.info("Input commit messages:")
    for i, msg in enumerate(commit_messages):
        logger.info(f"  {i+1}. {msg}")
    
    # Check for API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY environment variable not set")
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    
    logger.info("Initializing Anthropic client")
    client = Anthropic(api_key=api_key)
    
    # Combine all commit messages
    commits_text = "\n".join(f"- {msg}" for msg in commit_messages)
    logger.info(f"Combined commit text length: {len(commits_text)} characters")
    
    prompt = f"""You are helping create a "build in public" social media post from these git commit messages:

{commits_text}

Transform these technical commit messages into a single, casual, engaging post that:
- Is under 280 characters
- Feels natural and enthusiastic (like you're sharing progress with friends)
- Highlights what was built or improved
- Doesn't use hashtags or emojis
- Avoids overly technical jargon

Just respond with the post text, nothing else."""
    
    logger.info(f"Prompt length: {len(prompt)} characters")
    logger.info("Sending request to Claude API")
    
    try:
        message = client.messages.create(
            model="claude-4.5-haiku-20250514",
            max_tokens=200,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        logger.info("Claude API request completed successfully")
        logger.info(f"Response content length: {len(message.content[0].text)} characters")
        
        # Extract the text from the response
        result = message.content[0].text.strip()
        logger.info(f"Generated post content: {result}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error calling Claude API: {str(e)}")
        raise

