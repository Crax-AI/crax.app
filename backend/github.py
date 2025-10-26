import os
import logging
import json
from anthropic import Anthropic

# Configure logging for this module
logger = logging.getLogger(__name__)


def clean_json_response(response_text: str) -> str:
    """
    Clean AI response text by removing markdown code blocks if present.
    
    Args:
        response_text: Raw response text from AI
        
    Returns:
        Cleaned text ready for JSON parsing
    """
    cleaned_response = response_text.strip()
    
    if cleaned_response.startswith("```json"):
        # Remove ```json from start and ``` from end
        cleaned_response = cleaned_response[7:]  # Remove "```json"
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]  # Remove trailing "```"
        cleaned_response = cleaned_response.strip()
    elif cleaned_response.startswith("```"):
        # Handle generic code blocks
        cleaned_response = cleaned_response[3:]  # Remove "```"
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]  # Remove trailing "```"
        cleaned_response = cleaned_response.strip()
    
    return cleaned_response

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
            model="claude-haiku-4-5-20251001",
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


def should_post_about_commits(commit_messages: list[str]) -> tuple[bool, str]:
    """
    Use Claude to determine if recent commits warrant a "build in public" post.
    
    Args:
        commit_messages: List of recent commit messages
        
    Returns:
        Tuple of (should_post, reasoning)
    """
    logger.info(f"Evaluating {len(commit_messages)} commits for post worthiness")
    
    # Log commit messages for debugging
    logger.info("Recent commit messages:")
    for i, msg in enumerate(commit_messages):
        logger.info(f"  {i+1}. {msg}")
    
    # Check for API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY environment variable not set")
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    
    logger.info("Initializing Anthropic client for post evaluation")
    client = Anthropic(api_key=api_key)
    
    # Combine all commit messages
    commits_text = "\n".join(f"- {msg}" for msg in commit_messages)
    logger.info(f"Combined commit text length: {len(commits_text)} characters")
    
    prompt = f"""You are evaluating whether recent commits warrant a "build in public" social media post.

Recent commits:
{commits_text}

Consider these factors:
- Is there meaningful progress or a new feature?
- Are there multiple commits that together show significant work?
- Would this be interesting to followers who want to see development progress?
- Is this more than just minor fixes or routine maintenance?

Respond with a JSON object containing:
- "should_post": true/false
- "reasoning": brief explanation of your decision
Surround the JSON object with ```json and ```.

Examples of what warrants posting:
- New features or major functionality
- Significant refactoring or improvements
- Multiple commits showing iterative development
- Bug fixes that solve important problems

Examples of what doesn't warrant posting:
- Single minor typo fixes
- Routine dependency updates
- Small formatting changes
- Single commit with minimal impact

Be selective - only post about meaningful progress."""
    
    logger.info(f"Prompt length: {len(prompt)} characters")
    logger.info("Sending evaluation request to Claude API")
    
    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        logger.info("Claude API evaluation request completed successfully")
        
        # Extract the JSON response
        response_text = message.content[0].text.strip()
        logger.info(f"Claude response: {response_text}")
        
        # Clean the response text by removing markdown code blocks if present
        cleaned_response = clean_json_response(response_text)
        logger.info(f"Cleaned response: {cleaned_response}")
        
        # Parse JSON response
        try:
            result = json.loads(cleaned_response)
            should_post = result.get("should_post", False)
            reasoning = result.get("reasoning", "No reasoning provided")
            
            logger.info(f"Evaluation result: {'POST' if should_post else 'SKIP'}")
            logger.info(f"Reasoning: {reasoning}")
            
            return should_post, reasoning
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude JSON response: {str(e)}")
            logger.error(f"Raw response: {response_text}")
            logger.error(f"Cleaned response: {cleaned_response}")
            # Fallback: if we can't parse, be conservative and don't post
            return False, f"Failed to parse AI response: {str(e)}"
        
    except Exception as e:
        logger.error(f"Error calling Claude API for evaluation: {str(e)}")
        # Fallback: if AI fails, be conservative and don't post
        return False, f"AI evaluation failed: {str(e)}"

