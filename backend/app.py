import os
import logging
from typing import Any
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client
from github import summarize_commits
from utils import verify_github_signature
from database import resolve_user_id, store_commits, should_create_post, create_post

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
    if not verify_github_signature(body, signature, GITHUB_WEBHOOK_SECRET):
        logger.error("GitHub signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    logger.info("GitHub signature verified successfully")
    
    # Parse the JSON payload
    logger.info("Parsing JSON payload")
    payload = await request.json()
    logger.info(f"Payload keys: {list(payload.keys())}")
    
    # Extract repository information
    repository = payload.get("repository", {})
    is_private = repository.get("private", True)
    logger.info(f"Repository private status: {is_private}")
    
    # Only process pushes to main branch
    ref = payload.get("ref")
    logger.info(f"Push reference: {ref}")
    
    if ref != "refs/heads/main":
        logger.info(f"Skipping push to {ref} - only processing main branch")
        return {
            "message": "Skipped - not a push to main branch",
            "ref": ref
        }
    
    logger.info("Processing push to main branch of repository")
    
    # Extract commits and repository info
    commits = payload.get("commits", [])
    repository_id = str(repository.get("id", ""))
    repository_name = repository.get("name", "")
    repository_owner = repository.get("owner", {})
    owner_name = repository_owner.get("name", "")
    pushed_at = repository.get("pushed_at", "")
    
    logger.info(f"Repository: {repository_name} (ID: {repository_id})")
    logger.info(f"Repository owner: {owner_name}")
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
    user_id = resolve_user_id(supabase, github_username)
    
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
        commit_ids = store_commits(supabase, user_id, commits, repository_id, repository_name, owner_name, pushed_at)
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
        should_post, reasoning = should_create_post(supabase, user_id, repository_id)
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
        post = create_post(supabase, user_id, post_content, commit_ids)
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

