import functions_framework
import os
import requests
import json
import logging
from typing import Dict, Any
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
RAI_API_KEY = os.getenv("RAI_API_KEY")
RAI_REGION = os.getenv("RAI_REGION")
RAI_PROJECT = os.getenv("RAI_PROJECT")
RAI_LINKEDIN_TOOL_ID = os.getenv("RAI_LINKEDIN_TOOL_ID")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
CRAX_SECRET_KEY = os.getenv("CRAX_SECRET_KEY")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None


def verify_authorization(request) -> bool:
    """
    Verify the authorization token from the request header
    """
    if not CRAX_SECRET_KEY:
        logger.warning("CRAX_SECRET_KEY not configured, skipping authorization")
        return True  # Allow requests if no secret key is configured
    
    # Get the Authorization header
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        logger.warning("No Authorization header provided")
        return False
    
    # Check if it's a Bearer token
    if not auth_header.startswith('Bearer '):
        logger.warning("Invalid Authorization header format")
        return False
    
    # Extract the token
    token = auth_header[7:]  # Remove 'Bearer ' prefix
    
    # Verify the token matches our secret key
    if token != CRAX_SECRET_KEY:
        logger.warning(f"Invalid authorization token provided")
        return False
    
    return True


def scrape_linkedin_profile(linkedin_url: str) -> Dict[str, Any]:
    """
    Scrape LinkedIn profile using Relevance AI API
    """
    url = f"https://api-{RAI_REGION}.stack.tryrelevance.com/latest/studios/{RAI_LINKEDIN_TOOL_ID}/trigger_limited"
    headers = {
        "Authorization": f"{RAI_PROJECT}:{RAI_API_KEY}"
    }
    body = {
        "params": {
            "url": linkedin_url,
        },
        "project": RAI_PROJECT,
    }

    try:
        response = requests.post(url, headers=headers, json=body, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        
        if len(result.get("errors", [])) > 0:
            raise Exception(f"LinkedIn scraping failed: {result.get('errors')}")
        
        return result["output"]["linkedin_profile"]
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {str(e)}")
        raise Exception(f"Failed to scrape LinkedIn profile: {str(e)}")
    except KeyError as e:
        logger.error(f"Unexpected response format: {str(e)}")
        raise Exception(f"Unexpected response format from LinkedIn scraper: {str(e)}")


def update_supabase_profile(profile_data: Dict[str, Any], user_id: str) -> bool:
    """
    Update existing Supabase database row with LinkedIn profile data in linkedin_data_raw column
    """
    if not supabase:
        logger.warning("Supabase not configured, skipping database update")
        return False
    
    try:
        # Prepare data for database update
        update_data = {
            "linkedin_data_raw": profile_data
        }
        
        # Update the existing profile row by matching user_id
        # Updates the linkedin_data_raw JSONB column
        result = supabase.table("profiles").update(update_data).eq("user_id", user_id).execute()
        
        if not result.data:
            logger.warning(f"No existing profile found for user_id: {user_id}")
            return False
        
        logger.info(f"Successfully updated profile in Supabase for user_id {user_id}: {result.data}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to update Supabase: {str(e)}")
        return False


@functions_framework.http
def process_linkedin_webhook(request):
    """
    Cloud Run function to process LinkedIn webhook requests
    """
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    }
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return ('', 204, headers)
    
    # Only allow POST requests
    if request.method != 'POST':
        return ('Method not allowed', 405, headers)
    
    # Verify authorization
    if not verify_authorization(request):
        return ({'error': 'Unauthorized'}, 401, headers)
    
    try:
        # Parse request data
        request_data = request.get_json(silent=True)
        
        if not request_data:
            return ({'error': 'No JSON data provided'}, 400, headers)
        
        # Extract LinkedIn URL and user_id from request
        linkedin_url = request_data.get('linkedin_url')
        user_id = request_data.get('user_id')
        
        if not linkedin_url:
            return ({'error': 'linkedin_url is required'}, 400, headers)
        
        if not user_id:
            return ({'error': 'user_id is required'}, 400, headers)
        
        # Validate LinkedIn URL format
        if not linkedin_url.startswith(('https://www.linkedin.com/', 'https://linkedin.com/')):
            return ({'error': 'Invalid LinkedIn URL format'}, 400, headers)
        
        logger.info(f"Processing LinkedIn URL: {linkedin_url}")
        
        # Scrape LinkedIn profile
        profile_data = scrape_linkedin_profile(linkedin_url)
        
        # Update Supabase if configured
        db_updated = update_supabase_profile(profile_data, user_id)
        
        # Return success response
        response_data = {
            'success': True,
            'profile': profile_data,
            'database_updated': db_updated
        }
        
        logger.info("Successfully processed LinkedIn profile")
        return (response_data, 200, headers)
        
    except Exception as e:
        logger.error(f"Error processing LinkedIn webhook: {str(e)}")
        error_response = {
            'success': False,
            'error': str(e)
        }
        return (error_response, 500, headers)