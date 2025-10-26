import os
import hmac
import hashlib
import logging
from datetime import datetime

# Configure logging for this module
logger = logging.getLogger(__name__)


def convert_timestamp_to_iso(timestamp: str | int | None) -> str | None:
    """
    Convert timestamp to ISO format string for PostgreSQL.
    Handles both Unix timestamps and ISO format strings.
    
    Args:
        timestamp: Unix timestamp (int/str) or ISO format string
        
    Returns:
        ISO format timestamp string or None if invalid
    """
    if timestamp is None:
        return None
    
    try:
        # If it's already an ISO format string (contains 'T' or '-'), return as-is
        if isinstance(timestamp, str) and ('T' in timestamp or '-' in timestamp):
            # Validate it's a proper ISO format by trying to parse it
            datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            logger.debug(f"Timestamp {timestamp} is already in ISO format")
            return timestamp
        
        # Convert to int if it's a string (Unix timestamp)
        if isinstance(timestamp, str):
            timestamp_int = int(timestamp)
        else:
            timestamp_int = timestamp
        
        # Validate timestamp range (reasonable bounds for Unix timestamps)
        # Min: Jan 1, 1970 (0), Max: Jan 1, 2100 (4102444800)
        if timestamp_int < 0 or timestamp_int > 4102444800:
            logger.warning(f"Timestamp {timestamp_int} is outside reasonable range")
            return None
        
        # Convert Unix timestamp to datetime and then to ISO format
        dt = datetime.fromtimestamp(timestamp_int)
        iso_string = dt.isoformat()
        
        logger.debug(f"Converted Unix timestamp {timestamp_int} to {iso_string}")
        return iso_string
        
    except (ValueError, TypeError, OSError) as e:
        logger.error(f"Failed to convert timestamp {timestamp}: {str(e)}")
        return None


def verify_github_signature(payload_body: bytes, signature_header: str, webhook_secret: str) -> bool:
    """
    Verify that the payload was sent from GitHub by validating SHA256 signature.
    
    Args:
        payload_body: Raw request body bytes
        signature_header: The X-Hub-Signature-256 header value
        webhook_secret: The GitHub webhook secret
        
    Returns:
        True if signature is valid, False otherwise
    """
    logger.info(f"Verifying GitHub signature - payload size: {len(payload_body)} bytes")
    
    if not webhook_secret:
        logger.error("GitHub webhook secret is not configured")
        raise ValueError("GitHub webhook secret is not configured")
    
    if not signature_header:
        logger.warning("No signature header provided")
        return False
    
    # Compute the expected signature
    hash_object = hmac.new(
        webhook_secret.encode('utf-8'),
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
