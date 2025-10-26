import os
import hmac
import hashlib
import logging
from typing import Any
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client
from github import summarize_commits

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
logger.info("Environment variables loaded")

# Initialize FastAPI app
app = FastAPI(title="Crax Webhook Server")
logger.info("FastAPI application initialized")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS middleware configured")

# Environment variables
GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

logger.info(f"Environment variables loaded - GitHub secret: {'***' if GITHUB_WEBHOOK_SECRET else 'NOT SET'}")
logger.info(f"Supabase URL: {SUPABASE_URL[:20] + '...' if SUPABASE_URL else 'NOT SET'}")
logger.info(f"Supabase key: {'***' if SUPABASE_SECRET_KEY else 'NOT SET'}")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
logger.info("Supabase client initialized")


@app.get("/")
async def health_check():
    """Health check endpoint"""
    logger.info("Health check endpoint accessed")
    return {"status": "ok", "service": "crax-webhook-server"}


def verify_github_signature(payload_body: bytes, signature_header: str) -> bool:
    """
    Verify that the payload was sent from GitHub by validating SHA256 signature.
    
    Args:
        payload_body: Raw request body bytes
        signature_header: The X-Hub-Signature-256 header value
        
    Returns:
        True if signature is valid, False otherwise
    """
    logger.info(f"Verifying GitHub signature - payload size: {len(payload_body)} bytes")
    
    if not GITHUB_WEBHOOK_SECRET:
        logger.error("GITHUB_WEBHOOK_SECRET is not configured")
        raise ValueError("GITHUB_WEBHOOK_SECRET is not configured")
    
    if not signature_header:
        logger.warning("No signature header provided")
        return False
    
    # Compute the expected signature
    hash_object = hmac.new(
        GITHUB_WEBHOOK_SECRET.encode('utf-8'),
        msg=payload_body,
        digestmod=hashlib.sha256
    )
    expected_signature = f"sha256={hash_object.hexdigest()}"
    
    logger.info(f"Expected signature: {expected_signature[:20]}...")
    logger.info(f"Received signature: {signature_header[:20]}...")
    
    # Compare signatures using constant-time comparison
    is_valid = hmac.compare_digest(expected_signature, signature_header)
    logger.info(f"Signature verification result: {'VALID' if is_valid else 'INVALID'}")
    
    return is_valid


def resolve_user_id(github_username: str) -> str | None:
    """
    Resolve GitHub username to Supabase user ID.
    
    Args:
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


def store_commits(user_id: str, commits: list[dict], repository_id: str, repository_name: str, pushed_at: str) -> list[str]:
    """
    Store commits in the commits table.
    
    Args:
        user_id: The user ID who made the commits
        commits: List of commit objects from GitHub webhook
        repository_id: GitHub repository ID
        repository_name: Repository name
        pushed_at: ISO timestamp when the push occurred
        
    Returns:
        List of commit IDs that were stored
    """
    logger.info(f"Storing {len(commits)} commits for user {user_id}")
    
    commit_data = []
    for commit in commits:
        commit_entry = {
            "user_id": user_id,
            "committed_at": commit.get("timestamp"),
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


def should_create_post(user_id: str, repository_id: str) -> tuple[bool, str]:
    """
    Use AI to determine if recent commits warrant a build update post.
    
    Args:
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


def create_post(author_id: str, description: str, commit_ids: list[str]) -> dict[str, Any]:
    """
    Create a post in Supabase and link it to commits.
    
    Args:
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


@app.post("/webhooks/github")
async def github_webhook(request: Request):
    """
    Handle GitHub push webhook events.
    
    Verifies the signature, processes commits, and creates a post.
    """
    logger.info("GitHub webhook received - starting processing")
    
    # Get the signature from headers
    signature = request.headers.get("X-Hub-Signature-256")
    logger.info(f"Signature header present: {'Yes' if signature else 'No'}")
    
    if not signature:
        logger.error("Missing X-Hub-Signature-256 header")
        raise HTTPException(status_code=400, detail="Missing X-Hub-Signature-256 header")
    
    # Get the raw body for signature verification
    body = await request.body()
    logger.info(f"Request body size: {len(body)} bytes")
    
    # Verify the signature
    logger.info("Verifying GitHub signature")
    if not verify_github_signature(body, signature):
        logger.error("GitHub signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    logger.info("GitHub signature verified successfully")
    
    # Parse the JSON payload
    logger.info("Parsing JSON payload")
    payload = await request.json()
    logger.info(f"Payload keys: {list(payload.keys())}")
    
    # Check if repository is public
    repository = payload.get("repository", {})
    is_private = repository.get("private", True)
    logger.info(f"Repository private status: {is_private}")
    
    if is_private:
        logger.info("Skipping private repository")
        return {
            "message": "Skipped - private repository",
            "repository": repository.get("full_name", "unknown")
        }
    
    # Only process pushes to main branch
    ref = payload.get("ref")
    logger.info(f"Push reference: {ref}")
    
    if ref != "refs/heads/main":
        logger.info(f"Skipping push to {ref} - only processing main branch")
        return {
            "message": "Skipped - not a push to main branch",
            "ref": ref
        }
    
    logger.info("Processing push to main branch of public repository")
    
    # Extract commits and repository info
    commits = payload.get("commits", [])
    repository_id = str(repository.get("id", ""))
    repository_name = repository.get("name", "")
    pushed_at = repository.get("pushed_at", "")
    
    logger.info(f"Repository: {repository_name} (ID: {repository_id})")
    logger.info(f"Number of commits in push: {len(commits)}")
    logger.info(f"Pushed at: {pushed_at}")
    
    if not commits:
        logger.warning("No commits found in push event")
        return {"message": "No commits found in push event"}
    
    # Resolve user ID from GitHub username
    sender = payload.get("sender", {})
    github_username = sender.get("login")
    logger.info(f"GitHub username from sender: {github_username}")
    
    if not github_username:
        logger.error("No GitHub username found in webhook payload")
        raise HTTPException(status_code=400, detail="No GitHub username found in webhook payload")
    
    logger.info(f"Resolving user ID for GitHub username: {github_username}")
    user_id = resolve_user_id(github_username)
    
    if not user_id:
        logger.error(f"User not found for GitHub username: {github_username}")
        raise HTTPException(
            status_code=404,
            detail=f"User not found for GitHub username: {github_username}"
        )
    
    logger.info(f"User ID resolved: {user_id}")
    
    # Store all commits in the database
    logger.info("Storing commits in database")
    try:
        commit_ids = store_commits(user_id, commits, repository_id, repository_name, pushed_at)
        logger.info(f"Stored {len(commit_ids)} commits")
    except Exception as e:
        logger.error(f"Failed to store commits: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store commits: {str(e)}"
        )
    
    # Check if recent commits warrant a post
    logger.info("Evaluating if commits warrant a build update post")
    try:
        should_post, reasoning = should_create_post(user_id, repository_id)
        logger.info(f"AI evaluation result: {'POST' if should_post else 'SKIP'}")
        logger.info(f"Reasoning: {reasoning}")
    except Exception as e:
        logger.error(f"Failed to evaluate commits: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate commits: {str(e)}"
        )
    
    if not should_post:
        logger.info("Commits do not warrant a post - skipping post creation")
        return {
            "message": "Commits stored but no post created",
            "reasoning": reasoning,
            "commits_stored": len(commit_ids)
        }
    
    # Generate the post content using Claude
    logger.info("Generating post content using Claude")
    commit_messages = [commit.get("message", "") for commit in commits if commit.get("message")]
    
    try:
        post_content = summarize_commits(commit_messages)
        logger.info(f"Post content generated successfully - length: {len(post_content)} characters")
        logger.info(f"Generated content: {post_content}")
    except Exception as e:
        logger.error(f"Failed to generate post summary: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate post summary: {str(e)}"
        )
    
    # Create the post in Supabase and link commits
    logger.info("Creating post in Supabase")
    try:
        post = create_post(user_id, post_content, commit_ids)
        logger.info(f"Post created successfully with ID: {post['id']}")
    except Exception as e:
        logger.error(f"Failed to create post: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create post: {str(e)}"
        )
    
    logger.info("GitHub webhook processing completed successfully")
    
    return {
        "message": "Post created successfully",
        "post_id": post["id"],
        "content": post_content,
        "commits_processed": len(commits),
        "commits_linked": len(commit_ids),
        "reasoning": reasoning
    }

