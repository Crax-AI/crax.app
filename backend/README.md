# Crax Backend

FastAPI server for handling GitHub webhooks and creating automated "build in public" posts.

## Setup

### 1. Install Dependencies

```bash
uv sync
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```bash
# GitHub Webhook Configuration
# Generate this secret when setting up your webhook in GitHub repo settings
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Anthropic API Configuration
# Get your API key from https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Supabase Configuration
# Get these from your Supabase project settings
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_service_role_key_here
```

### 3. Run the Server

```bash
uv run python main.py
```

Or using uvicorn directly:

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The server will start on `http://localhost:8000`.

### 4. Testing

Test the AI commit evaluation without starting the server:

```bash
uv run python test_webhook_v2.py evaluate
```

Test the full webhook endpoint (requires server to be running and .env configured):

```bash
uv run python test_webhook_v2.py webhook
```

## GitHub Webhook Setup

1. Go to your GitHub repository settings
2. Navigate to **Webhooks** → **Add webhook**
3. Set the **Payload URL** to your server's public URL: `https://your-domain.com/webhooks/github`
4. Set **Content type** to `application/json`
5. Enter your **Secret** (the same value as `GITHUB_WEBHOOK_SECRET`)
6. Select **Just the push event**
7. Ensure **Active** is checked
8. Click **Add webhook**

## How It Works

1. GitHub sends a push webhook when code is pushed to the repository
2. The server verifies the webhook signature for security
3. **Repository filtering**: Only processes pushes to **public repositories** on the **main branch**
4. **Commit storage**: All commits are stored in the `commits` table with detailed information
5. **AI evaluation**: Claude analyzes recent commits to determine if they warrant a "build in public" post
6. **Smart posting**: Only creates posts when AI determines there's meaningful progress worth sharing
7. **Commit linking**: When a post is created, it's linked to the relevant commits via `post_id`

### Key Features

- **Repository Privacy Filter**: Automatically skips private repositories
- **Branch Filtering**: Only processes pushes to the main branch
- **Commit Tracking**: Stores all commits with file changes, timestamps, and metadata
- **AI-Powered Decision Making**: Uses Claude to determine if commits warrant a social post
- **Selective Posting**: Prevents spam by only posting about meaningful progress
- **Commit-Post Linking**: Tracks which commits contributed to each post

## API Endpoints

### `GET /`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "crax-webhook-server"
}
```

### `POST /webhooks/github`
Receives GitHub push webhooks.

**Headers:**
- `X-Hub-Signature-256`: GitHub's HMAC signature for verification

**Response (post created):**
```json
{
  "message": "Post created successfully",
  "post_id": "uuid-here",
  "content": "The generated post content",
  "commits_processed": 3,
  "commits_linked": 3,
  "reasoning": "Multiple commits show significant feature development"
}
```

**Response (commits stored, no post):**
```json
{
  "message": "Commits stored but no post created",
  "reasoning": "Minor changes don't warrant a build update",
  "commits_stored": 2
}
```

**Response (skipped - private repo):**
```json
{
  "message": "Skipped - private repository",
  "repository": "user/private-repo"
}
```

**Response (skipped - wrong branch):**
```json
{
  "message": "Skipped - not a push to main branch",
  "ref": "refs/heads/feature-branch"
}
```

## Error Handling

- **400**: Invalid or missing signature, malformed payload
- **404**: GitHub user not found in Supabase
- **500**: Claude API error or Supabase error

