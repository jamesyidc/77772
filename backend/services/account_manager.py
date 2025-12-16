"""
Multi-Account Management Service
"""
from typing import Dict, List, Optional, Any
from backend.services.okx_client import OKXClient
from backend.config.config import config


class AccountManager:
    """Manage multiple OKX trading accounts"""
    
    def __init__(self):
        self.accounts: Dict[str, OKXClient] = {}
        self._load_accounts()
    
    def _load_accounts(self):
        """Load all configured accounts"""
        accounts_config = config.get_accounts()
        for name, credentials in accounts_config.items():
            self.accounts[name] = OKXClient(
                api_key=credentials["api_key"],
                secret_key=credentials["secret_key"],
                passphrase=credentials["passphrase"]
            )
    
    def get_account(self, account_name: str) -> Optional[OKXClient]:
        """Get specific account client"""
        return self.accounts.get(account_name)
    
    def get_all_accounts(self) -> List[str]:
        """Get list of all account names"""
        return list(self.accounts.keys())
    
    def execute_single(self, account_name: str, operation: str, **kwargs) -> Dict:
        """
        Execute operation on single account
        
        Args:
            account_name: Name of the account
            operation: Operation name (method name in OKXClient)
            **kwargs: Arguments for the operation
        
        Returns:
            Operation result
        """
        account = self.get_account(account_name)
        if not account:
            return {
                "code": "-1",
                "msg": f"Account {account_name} not found",
                "data": []
            }
        
        try:
            method = getattr(account, operation)
            result = method(**kwargs)
            return {
                "account": account_name,
                "operation": operation,
                "result": result
            }
        except AttributeError:
            return {
                "code": "-1",
                "msg": f"Operation {operation} not supported",
                "data": []
            }
        except Exception as e:
            return {
                "code": "-1",
                "msg": f"Error executing {operation}: {str(e)}",
                "data": []
            }
    
    def execute_multi(self, account_names: List[str], operation: str, **kwargs) -> List[Dict]:
        """
        Execute operation on multiple accounts
        
        Args:
            account_names: List of account names
            operation: Operation name
            **kwargs: Arguments for the operation
        
        Returns:
            List of results for each account
        """
        results = []
        for account_name in account_names:
            result = self.execute_single(account_name, operation, **kwargs)
            results.append(result)
        return results
    
    def execute_all(self, operation: str, **kwargs) -> List[Dict]:
        """
        Execute operation on all accounts
        
        Args:
            operation: Operation name
            **kwargs: Arguments for the operation
        
        Returns:
            List of results for each account
        """
        return self.execute_multi(self.get_all_accounts(), operation, **kwargs)
    
    # ==================== Aggregated Queries ====================
    
    def get_all_balances(self, account_names: Optional[List[str]] = None) -> Dict:
        """
        Get balances for multiple accounts
        
        Args:
            account_names: List of account names (None for all accounts)
        
        Returns:
            Aggregated balance information
        """
        accounts = account_names or self.get_all_accounts()
        balances = {}
        
        for account_name in accounts:
            account = self.get_account(account_name)
            if account:
                balance = account.get_balance()
                balances[account_name] = balance
        
        return balances
    
    def get_all_positions(self, account_names: Optional[List[str]] = None,
                         inst_type: str = "SWAP") -> Dict:
        """
        Get positions for multiple accounts
        
        Args:
            account_names: List of account names (None for all accounts)
            inst_type: Instrument type
        
        Returns:
            Aggregated position information
        """
        accounts = account_names or self.get_all_accounts()
        positions = {}
        
        for account_name in accounts:
            account = self.get_account(account_name)
            if account:
                position = account.get_positions(inst_type=inst_type)
                positions[account_name] = position
        
        return positions
    
    def get_all_pending_orders(self, account_names: Optional[List[str]] = None,
                              inst_type: str = "SWAP") -> Dict:
        """Get pending orders for multiple accounts"""
        accounts = account_names or self.get_all_accounts()
        orders = {}
        
        for account_name in accounts:
            account = self.get_account(account_name)
            if account:
                pending = account.get_pending_orders(inst_type=inst_type)
                orders[account_name] = pending
        
        return orders
    
    def cancel_all_orders_multi(self, account_names: Optional[List[str]] = None,
                               inst_id: Optional[str] = None) -> Dict:
        """Cancel all orders for multiple accounts"""
        accounts = account_names or self.get_all_accounts()
        results = {}
        
        for account_name in accounts:
            account = self.get_account(account_name)
            if account:
                result = account.cancel_all_orders(inst_id=inst_id)
                results[account_name] = result
        
        return results
    
    # ==================== Trading Operations ====================
    
    def place_order_multi(self, account_names: List[str], inst_id: str,
                         td_mode: str, side: str, ord_type: str, sz: str,
                         **kwargs) -> Dict:
        """Place order on multiple accounts"""
        results = {}
        
        for account_name in account_names:
            account = self.get_account(account_name)
            if account:
                result = account.place_order(
                    inst_id=inst_id,
                    td_mode=td_mode,
                    side=side,
                    ord_type=ord_type,
                    sz=sz,
                    **kwargs
                )
                results[account_name] = result
        
        return results
    
    def set_leverage_multi(self, account_names: List[str], inst_id: str,
                          lever: int, mgn_mode: str = "cross") -> Dict:
        """Set leverage on multiple accounts"""
        results = {}
        
        for account_name in account_names:
            account = self.get_account(account_name)
            if account:
                result = account.set_leverage(
                    inst_id=inst_id,
                    lever=lever,
                    mgn_mode=mgn_mode
                )
                results[account_name] = result
        
        return results


# Global account manager instance
account_manager = AccountManager()
