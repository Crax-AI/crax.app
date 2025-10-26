import os
import hmac
import hashlib
import logging
from datetime import datetime

# Configure logging for this module
logger = logging.getLogger(__name__)


def convert_unix_to_iso(unix_timestamp: str | int | None) -> str | None:
    """
    Convert Unix timestamp to ISO format string for PostgreSQL.
    
    Args:
        unix_timestamp: Unix timestamp as string or int
        
    Returns:
        ISO format timestamp string or None if invalid
    """
    if not unix_timestamp:
        return None
    
    try:
        # Convert to int if it's a string
        if isinstance(unix_timestamp, str):
            timestamp_int = int(unix_timestamp)
        else:
            timestamp_int = unix_timestamp
        
        # Validate timestamp range (reasonable bounds for Unix timestamps)
        # Min: Jan 1, 1970 (0), Max: Jan 1, 2100 (4102444800)
        if timestamp_int < 0 or timestamp_int > 4102444800:
            logger.warning(f"Timestamp {timestamp_int} is outside reasonable range")
            return None
        
        # Convert Unix timestamp to datetime and then to ISO format
        dt = datetime.fromtimestamp(timestamp_int)
        iso_string = dt.isoformat()
        
        logger.debug(f"Converted timestamp {timestamp_int} to {iso_string}")
        return iso_string
        
    except (ValueError, TypeError, OSError) as e:
        logger.error(f"Failed to convert timestamp {unix_timestamp}: {str(e)}")
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
