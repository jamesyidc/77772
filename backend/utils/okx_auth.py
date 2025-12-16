"""
OKX API Authentication Utility
"""
import base64
import hmac
import hashlib
from datetime import datetime


class OKXAuth:
    """Handle OKX API authentication"""
    
    def __init__(self, api_key: str, secret_key: str, passphrase: str):
        self.api_key = api_key
        self.secret_key = secret_key
        self.passphrase = passphrase
    
    def get_timestamp(self) -> str:
        """Get ISO 8601 timestamp"""
        return datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    
    def sign(self, timestamp: str, method: str, request_path: str, body: str = '') -> str:
        """
        Generate signature for OKX API request
        
        Args:
            timestamp: ISO 8601 timestamp
            method: HTTP method (GET, POST, etc.)
            request_path: API endpoint path
            body: Request body (empty string for GET requests)
        
        Returns:
            Base64 encoded signature
        """
        message = timestamp + method.upper() + request_path + body
        mac = hmac.new(
            bytes(self.secret_key, encoding='utf8'),
            bytes(message, encoding='utf-8'),
            digestmod=hashlib.sha256
        )
        return base64.b64encode(mac.digest()).decode()
    
    def get_headers(self, method: str, request_path: str, body: str = '') -> dict:
        """
        Get authentication headers for OKX API request
        
        Args:
            method: HTTP method
            request_path: API endpoint path
            body: Request body
        
        Returns:
            Dictionary of headers
        """
        timestamp = self.get_timestamp()
        signature = self.sign(timestamp, method, request_path, body)
        
        return {
            'OK-ACCESS-KEY': self.api_key,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': self.passphrase,
            'Content-Type': 'application/json'
        }
