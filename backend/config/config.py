"""
Configuration management for OKX Trading System
"""
import os
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration"""
    
    # Server Configuration
    PORT = int(os.getenv("PORT", 8000))
    HOST = os.getenv("HOST", "0.0.0.0")
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret-key-in-production")
    
    # OKX API Configuration
    OKX_API_URL = os.getenv("OKX_API_URL", "https://www.okx.com")
    OKX_WS_URL = os.getenv("OKX_WS_URL", "wss://ws.okx.com:8443/ws/v5/public")
    
    # Trading Configuration
    DEFAULT_LEVERAGE = int(os.getenv("DEFAULT_LEVERAGE", 10))
    MAX_RETRY_ATTEMPTS = int(os.getenv("MAX_RETRY_ATTEMPTS", 3))
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", 10))
    
    # Position Size Presets (percentage of available balance)
    POSITION_SIZE_PRESETS = [10, 20, 25, 33, 50, 66, 100]
    
    @staticmethod
    def get_accounts() -> Dict[str, Dict[str, str]]:
        """
        Load all account configurations from environment variables
        Returns dict with account name as key and credentials as value
        """
        accounts = {}
        
        # Get all environment variables
        env_vars = os.environ
        
        # Find all unique account prefixes
        account_prefixes = set()
        for key in env_vars.keys():
            if key.endswith("_API_KEY"):
                prefix = key.replace("_API_KEY", "")
                account_prefixes.add(prefix)
        
        # Load credentials for each account
        for prefix in account_prefixes:
            api_key = env_vars.get(f"{prefix}_API_KEY")
            secret_key = env_vars.get(f"{prefix}_SECRET_KEY")
            passphrase = env_vars.get(f"{prefix}_PASSPHRASE")
            
            if api_key and secret_key and passphrase:
                accounts[prefix] = {
                    "api_key": api_key,
                    "secret_key": secret_key,
                    "passphrase": passphrase,
                    "name": prefix
                }
        
        return accounts


config = Config()
