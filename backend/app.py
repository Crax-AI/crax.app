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
        logging.FileHandler('crax_backend.log')
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


def create_post(author_id: str, description: str) -> dict[str, Any]:
    """
    Create a post in Supabase.
    
    Args:
        author_id: The user ID who authored the post
        description: The post content
        
    Returns:
        The created post data
    """
    logger.info(f"Creating post for author_id: {author_id}")
    logger.info(f"Post description length: {len(description)} characters")
    
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
    logger.info(f"Post created successfully with ID: {created_post['id']}")
    
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
    
    # Only process pushes to main branch
    ref = payload.get("ref")
    logger.info(f"Push reference: {ref}")
    
    if ref != "refs/heads/main":
        logger.info(f"Skipping push to {ref} - only processing main branch")
        return {
            "message": "Skipped - not a push to main branch",
            "ref": ref
        }
    
    logger.info("Processing push to main branch")
    
    # Extract commit messages
    commits = payload.get("commits", [])
    logger.info(f"Number of commits in push: {len(commits)}")
    
    if not commits:
        logger.warning("No commits found in push event")
        return {"message": "No commits found in push event"}
    
    commit_messages = [commit.get("message", "") for commit in commits if commit.get("message")]
    logger.info(f"Valid commit messages found: {len(commit_messages)}")
    
    if not commit_messages:
        logger.warning("No valid commit messages found")
        return {"message": "No valid commit messages found"}
    
    logger.info("Commit messages:")
    for i, msg in enumerate(commit_messages):
        logger.info(f"  {i+1}. {msg[:100]}{'...' if len(msg) > 100 else ''}")
    
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
    
    # Generate the post content using Claude
    logger.info("Generating post content using Claude")
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
    
    # Create the post in Supabase
    logger.info("Creating post in Supabase")
    try:
        post = create_post(user_id, post_content)
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
        "commits_processed": len(commit_messages)
    }

