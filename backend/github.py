import os
from anthropic import Anthropic


def summarize_commits(commit_messages: list[str]) -> str:
    """
    Use Claude 4.5 Haiku to summarize commit messages into a "build in public" style post.
    
    Args:
        commit_messages: List of commit messages from the push event
        
    Returns:
        A concise, casual, and engaging summary suitable for social posting
    """
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    # Combine all commit messages
    commits_text = "\n".join(f"- {msg}" for msg in commit_messages)
    
    prompt = f"""You are helping create a "build in public" social media post from these git commit messages:

{commits_text}

Transform these technical commit messages into a single, casual, engaging post that:
- Is under 280 characters
- Feels natural and enthusiastic (like you're sharing progress with friends)
- Highlights what was built or improved
- Doesn't use hashtags or emojis
- Avoids overly technical jargon

Just respond with the post text, nothing else."""
    
    message = client.messages.create(
        model="claude-4.5-haiku-20250514",
        max_tokens=200,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    
    # Extract the text from the response
    return message.content[0].text.strip()

