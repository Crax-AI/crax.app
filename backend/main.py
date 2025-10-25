import os
import hmac
import hashlib
from typing import Any
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client
from github import summarize_commits

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Crax Webhook Server")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)


@app.get("/")
async def health_check():
    """Health check endpoint"""
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
    if not GITHUB_WEBHOOK_SECRET:
        raise ValueError("GITHUB_WEBHOOK_SECRET is not configured")
    
    if not signature_header:
        return False
    
    # Compute the expected signature
    hash_object = hmac.new(
        GITHUB_WEBHOOK_SECRET.encode('utf-8'),
        msg=payload_body,
        digestmod=hashlib.sha256
    )
    expected_signature = f"sha256={hash_object.hexdigest()}"
    
    # Compare signatures using constant-time comparison
    return hmac.compare_digest(expected_signature, signature_header)


def resolve_user_id(github_username: str) -> str | None:
    """
    Resolve GitHub username to Supabase user ID.
    
    Args:
        github_username: GitHub username from the webhook
        
    Returns:
        User ID if found, None otherwise
    """
    # Construct the GitHub URL
    github_url = f"https://github.com/{github_username}"
    
    # Query Supabase for user with matching GitHub URL
    response = supabase.table("profiles").select("id").eq("github_url", github_url).execute()
    
    if response.data and len(response.data) > 0:
        return response.data[0]["id"]
    
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
    post_data = {
        "author_id": author_id,
        "description": description,
        "type": "push",
        "image_url": None,
        "video_url": None,
    }
    
    response = supabase.table("posts").insert(post_data).execute()
    
    if not response.data:
        raise Exception("Failed to create post")
    
    return response.data[0]


@app.post("/webhooks/github")
async def github_webhook(request: Request):
    """
    Handle GitHub push webhook events.
    
    Verifies the signature, processes commits, and creates a post.
    """
    # Get the signature from headers
    signature = request.headers.get("X-Hub-Signature-256")
    
    if not signature:
        raise HTTPException(status_code=400, detail="Missing X-Hub-Signature-256 header")
    
    # Get the raw body for signature verification
    body = await request.body()
    
    # Verify the signature
    if not verify_github_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Parse the JSON payload
    payload = await request.json()
    
    # Only process pushes to main branch
    if payload.get("ref") != "refs/heads/main":
        return {
            "message": "Skipped - not a push to main branch",
            "ref": payload.get("ref")
        }
    
    # Extract commit messages
    commits = payload.get("commits", [])
    
    if not commits:
        return {"message": "No commits found in push event"}
    
    commit_messages = [commit.get("message", "") for commit in commits if commit.get("message")]
    
    if not commit_messages:
        return {"message": "No valid commit messages found"}
    
    # Resolve user ID from GitHub username
    sender = payload.get("sender", {})
    github_username = sender.get("login")
    
    if not github_username:
        raise HTTPException(status_code=400, detail="No GitHub username found in webhook payload")
    
    user_id = resolve_user_id(github_username)
    
    if not user_id:
        raise HTTPException(
            status_code=404,
            detail=f"User not found for GitHub username: {github_username}"
        )
    
    # Generate the post content using Claude
    try:
        post_content = summarize_commits(commit_messages)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate post summary: {str(e)}"
        )
    
    # Create the post in Supabase
    try:
        post = create_post(user_id, post_content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create post: {str(e)}"
        )
    
    return {
        "message": "Post created successfully",
        "post_id": post["id"],
        "content": post_content,
        "commits_processed": len(commit_messages)
    }


def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
