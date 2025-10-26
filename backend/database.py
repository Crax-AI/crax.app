import logging
from typing import Any
from supabase import Client

# Configure logging for this module
logger = logging.getLogger(__name__)


def resolve_user_id(supabase: Client, github_username: str) -> str | None:
    """
    Resolve GitHub username to Supabase user ID.
    
    Args:
        supabase: Supabase client instance
        github_username: GitHub username from the webhook
        
    Returns:
        User ID if found, None otherwise
    """
    logger.info(f"Resolving user ID for GitHub username: {github_username}")
    
    # Construct the GitHub URL
    github_url = f"https://github.com/{github_username}"
    logger.info(f"Constructed GitHub URL: {github_url}")
    
    # Query Supabase for user with matching GitHub URL
    logger.info("Querying Supabase profiles table for matching GitHub URL")
    response = supabase.table("profiles").select("id").eq("github_url", github_url).execute()
    
    logger.info(f"Supabase query response: {len(response.data) if response.data else 0} results")
    
    if response.data and len(response.data) > 0:
        user_id = response.data[0]["id"]
        logger.info(f"Found user ID: {user_id}")
        return user_id
    
    logger.warning(f"No user found for GitHub username: {github_username}")
    return None


def store_commits(supabase: Client, user_id: str, commits: list[dict], repository_id: str, repository_name: str, pushed_at: str) -> list[str]:
    """
    Store commits in the commits table.
    
    Args:
        supabase: Supabase client instance
        user_id: The user ID who made the commits
        commits: List of commit objects from GitHub webhook
        repository_id: GitHub repository ID
        repository_name: Repository name
        pushed_at: ISO timestamp when the push occurred
        
    Returns:
        List of commit IDs that were stored
    """
    from utils import convert_unix_to_iso
    
    logger.info(f"Storing {len(commits)} commits for user {user_id}")
    
    commit_data = []
    for i, commit in enumerate(commits):
        # Convert Unix timestamp to ISO format for PostgreSQL
        original_timestamp = commit.get("timestamp")
        committed_at = convert_unix_to_iso(original_timestamp)
        
        logger.info(f"Commit {i+1}: timestamp {original_timestamp} -> {committed_at}")
        
        commit_entry = {
            "user_id": user_id,
            "committed_at": committed_at,
            "pushed_at": pushed_at,
            "commit_id": commit.get("id"),
            "message": commit.get("message", ""),
            "repository_id": repository_id,
            "repository_name": repository_name,
            "added_files": commit.get("added", []),
            "removed_files": commit.get("removed", []),
            "modified_files": commit.get("modified", [])
        }
        commit_data.append(commit_entry)
    
    logger.info("Inserting commits into Supabase commits table")
    response = supabase.table("commits").insert(commit_data).execute()
    
    if not response.data:
        logger.error("Failed to store commits - no data returned from Supabase")
        raise Exception("Failed to store commits")
    
    commit_ids = [commit["id"] for commit in response.data]
    logger.info(f"Successfully stored {len(commit_ids)} commits")
    
    return commit_ids


def should_create_post(supabase: Client, user_id: str, repository_id: str) -> tuple[bool, str]:
    """
    Use AI to determine if recent commits warrant a build update post.
    
    Args:
        supabase: Supabase client instance
        user_id: The user ID
        repository_id: The repository ID
        
    Returns:
        Tuple of (should_post, reasoning)
    """
    logger.info(f"Checking if commits warrant a post for user {user_id} in repo {repository_id}")
    
    # Get recent commits for this user and repository that haven't been posted about yet
    response = supabase.table("commits").select("*").eq("user_id", user_id).eq("repository_id", repository_id).is_("post_id", "null").order("committed_at", desc=True).limit(10).execute()
    
    if not response.data:
        logger.info("No recent commits found")
        return False, "No recent commits found"
    
    recent_commits = response.data
    logger.info(f"Found {len(recent_commits)} recent commits to evaluate")
    
    # Extract commit messages for AI evaluation
    commit_messages = [commit["message"] for commit in recent_commits]
    
    try:
        # Use Claude to determine if this warrants a post
        from github import should_post_about_commits
        should_post, reasoning = should_post_about_commits(commit_messages)
        
        logger.info(f"AI decision: {'POST' if should_post else 'SKIP'} - {reasoning}")
        return should_post, reasoning
        
    except Exception as e:
        logger.error(f"Error evaluating commits with AI: {str(e)}")
        return False, f"Error evaluating commits: {str(e)}"


def create_post(supabase: Client, author_id: str, description: str, commit_ids: list[str]) -> dict[str, Any]:
    """
    Create a post in Supabase and link it to commits.
    
    Args:
        supabase: Supabase client instance
        author_id: The user ID who authored the post
        description: The post content
        commit_ids: List of commit IDs to link to this post
        
    Returns:
        The created post data
    """
    logger.info(f"Creating post for author_id: {author_id}")
    logger.info(f"Post description length: {len(description)} characters")
    logger.info(f"Linking {len(commit_ids)} commits to this post")
    
    post_data = {
        "author_id": author_id,
        "description": description,
        "type": "push",
        "image_url": None,
        "video_url": None,
    }
    
    logger.info("Inserting post data into Supabase posts table")
    response = supabase.table("posts").insert(post_data).execute()
    
    logger.info(f"Supabase insert response: {len(response.data) if response.data else 0} results")
    
    if not response.data:
        logger.error("Failed to create post - no data returned from Supabase")
        raise Exception("Failed to create post")
    
    created_post = response.data[0]
    post_id = created_post["id"]
    logger.info(f"Post created successfully with ID: {post_id}")
    
    # Link commits to this post
    if commit_ids:
        logger.info(f"Linking {len(commit_ids)} commits to post {post_id}")
        update_response = supabase.table("commits").update({"post_id": post_id}).in_("id", commit_ids).execute()
        logger.info(f"Updated {len(update_response.data) if update_response.data else 0} commits")
    
    return created_post
