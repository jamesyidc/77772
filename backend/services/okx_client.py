"""
OKX API Client - Core trading functionality
"""
import json
import requests
from typing import Dict, List, Optional, Any
from backend.utils.okx_auth import OKXAuth
from backend.config.config import config


class OKXClient:
    """OKX API Client for trading operations"""
    
    def __init__(self, api_key: str, secret_key: str, passphrase: str, simulated: bool = False):
        self.api_key = api_key
        self.secret_key = secret_key
        self.passphrase = passphrase
        self.simulated = simulated  # True for demo trading, False for real trading
        self.auth = OKXAuth(api_key, secret_key, passphrase)
        self.base_url = config.OKX_API_URL
        self.timeout = config.REQUEST_TIMEOUT
    
    def _request(self, method: str, endpoint: str, params: Optional[Dict] = None, 
                 data: Optional[Dict] = None) -> Dict:
        """
        Make authenticated request to OKX API
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            params: Query parameters
            data: Request body data
        
        Returns:
            API response as dictionary
        """
        url = f"{self.base_url}{endpoint}"
        body = json.dumps(data) if data else ''
        
        # Build request path with query string for signature
        request_path = endpoint
        if params:
            # Convert params dict to query string
            query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
            request_path = f"{endpoint}?{query_string}"
        
        # Get authentication headers (must include query string in signature)
        headers = self.auth.get_headers(method, request_path, body)
        
        # Add x-simulated-trading header for demo/real trading
        # 0 = real trading (default), 1 = simulated/demo trading
        headers['x-simulated-trading'] = '1' if self.simulated else '0'
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                data=body,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {
                "code": "-1",
                "msg": f"Request failed: {str(e)}",
                "data": []
            }
    
    # ==================== Account APIs ====================
    
    def get_balance(self, ccy: Optional[str] = None) -> Dict:
        """
        Get account balance
        
        Args:
            ccy: Currency (optional, e.g., 'USDT')
        
        Returns:
            Balance information
        """
        endpoint = "/api/v5/account/balance"
        params = {"ccy": ccy} if ccy else {}
        return self._request("GET", endpoint, params=params)
    
    def get_positions(self, inst_type: str = "SWAP", inst_id: Optional[str] = None) -> Dict:
        """
        Get positions
        
        Args:
            inst_type: Instrument type (SWAP for perpetual contracts)
            inst_id: Instrument ID (e.g., 'BTC-USDT-SWAP')
        
        Returns:
            Position information
        """
        endpoint = "/api/v5/account/positions"
        params = {"instType": inst_type}
        if inst_id:
            params["instId"] = inst_id
        return self._request("GET", endpoint, params=params)
    
    def get_account_config(self) -> Dict:
        """Get account configuration"""
        endpoint = "/api/v5/account/config"
        return self._request("GET", endpoint)
    
    # ==================== Trading APIs ====================
    
    def set_leverage(self, inst_id: str, lever: int, mgn_mode: str = "cross", 
                     pos_side: Optional[str] = None) -> Dict:
        """
        Set leverage
        
        Args:
            inst_id: Instrument ID (e.g., 'BTC-USDT-SWAP')
            lever: Leverage (1-125 depending on instrument)
            mgn_mode: Margin mode ('cross' or 'isolated')
            pos_side: Position side ('long', 'short', or None for one-way mode)
        
        Returns:
            API response
        """
        endpoint = "/api/v5/account/set-leverage"
        data = {
            "instId": inst_id,
            "lever": str(lever),
            "mgnMode": mgn_mode
        }
        if pos_side:
            data["posSide"] = pos_side
        return self._request("POST", endpoint, data=data)
    
    def place_order(self, inst_id: str, td_mode: str, side: str, ord_type: str,
                   sz: str, px: Optional[str] = None, pos_side: Optional[str] = None,
                   reduce_only: bool = False, **kwargs) -> Dict:
        """
        Place order
        
        Args:
            inst_id: Instrument ID (e.g., 'BTC-USDT-SWAP')
            td_mode: Trade mode ('cross', 'isolated', 'cash')
            side: Order side ('buy' or 'sell')
            ord_type: Order type ('market', 'limit', 'post_only', etc.)
            sz: Order size (contracts or amount)
            px: Order price (required for limit orders)
            pos_side: Position side ('long' or 'short' for hedge mode)
            reduce_only: Whether to reduce position only
            **kwargs: Additional parameters (sl_trigger_px, tp_trigger_px, etc.)
        
        Returns:
            API response
        """
        endpoint = "/api/v5/trade/order"
        data = {
            "instId": inst_id,
            "tdMode": td_mode,
            "side": side,
            "ordType": ord_type,
            "sz": sz
        }
        
        if px:
            data["px"] = px
        if pos_side:
            data["posSide"] = pos_side
        if reduce_only:
            data["reduceOnly"] = "true"
        
        # Add additional parameters (stop loss, take profit, etc.)
        data.update(kwargs)
        
        return self._request("POST", endpoint, data=data)
    
    def place_algo_order(self, inst_id: str, td_mode: str, side: str, ord_type: str,
                        sz: str, **kwargs) -> Dict:
        """
        Place algorithmic order (conditional order, stop loss, take profit)
        
        Args:
            inst_id: Instrument ID
            td_mode: Trade mode
            side: Order side
            ord_type: Order type ('conditional', 'oco', 'trigger', 'iceberg', 'twap')
            sz: Order size
            **kwargs: Additional parameters based on order type
        
        Returns:
            API response
        """
        endpoint = "/api/v5/trade/order-algo"
        data = {
            "instId": inst_id,
            "tdMode": td_mode,
            "side": side,
            "ordType": ord_type,
            "sz": sz
        }
        data.update(kwargs)
        return self._request("POST", endpoint, data=data)
    
    def cancel_order(self, inst_id: str, ord_id: Optional[str] = None, 
                     cl_ord_id: Optional[str] = None) -> Dict:
        """
        Cancel order
        
        Args:
            inst_id: Instrument ID
            ord_id: Order ID
            cl_ord_id: Client order ID
        
        Returns:
            API response
        """
        endpoint = "/api/v5/trade/cancel-order"
        data = {"instId": inst_id}
        if ord_id:
            data["ordId"] = ord_id
        if cl_ord_id:
            data["clOrdId"] = cl_ord_id
        return self._request("POST", endpoint, data=data)
    
    def cancel_algo_order(self, algo_ids: List[Dict[str, str]]) -> Dict:
        """
        Cancel algorithmic orders
        
        Args:
            algo_ids: List of algo order identifiers
                     [{"algoId": "xxx", "instId": "BTC-USDT-SWAP"}, ...]
        
        Returns:
            API response
        """
        endpoint = "/api/v5/trade/cancel-algos"
        data = algo_ids
        return self._request("POST", endpoint, data=data)
    
    def cancel_all_orders(self, inst_id: Optional[str] = None, 
                         inst_type: str = "SWAP") -> Dict:
        """
        Cancel all pending orders
        
        Args:
            inst_id: Instrument ID (optional)
            inst_type: Instrument type
        
        Returns:
            Combined response from canceling all orders
        """
        results = {
            "regular_orders": [],
            "algo_orders": []
        }
        
        # Cancel regular orders
        pending_orders = self.get_pending_orders(inst_id=inst_id, inst_type=inst_type)
        if pending_orders.get("code") == "0" and pending_orders.get("data"):
            for order in pending_orders["data"]:
                result = self.cancel_order(
                    inst_id=order["instId"],
                    ord_id=order["ordId"]
                )
                results["regular_orders"].append(result)
        
        # Cancel algo orders
        algo_orders = self.get_algo_orders(inst_id=inst_id, inst_type=inst_type)
        if algo_orders.get("code") == "0" and algo_orders.get("data"):
            algo_ids = [
                {"algoId": order["algoId"], "instId": order["instId"]}
                for order in algo_orders["data"]
            ]
            if algo_ids:
                result = self.cancel_algo_order(algo_ids)
                results["algo_orders"].append(result)
        
        return results
    
    # ==================== Query APIs ====================
    
    def get_pending_orders(self, inst_type: str = "SWAP", 
                          inst_id: Optional[str] = None) -> Dict:
        """Get pending orders"""
        endpoint = "/api/v5/trade/orders-pending"
        params = {"instType": inst_type}
        if inst_id:
            params["instId"] = inst_id
        return self._request("GET", endpoint, params=params)
    
    def get_algo_orders(self, ord_type: str = "conditional", inst_type: str = "SWAP",
                       inst_id: Optional[str] = None) -> Dict:
        """Get algorithmic orders"""
        endpoint = "/api/v5/trade/orders-algo-pending"
        params = {
            "ordType": ord_type,
            "instType": inst_type
        }
        if inst_id:
            params["instId"] = inst_id
        return self._request("GET", endpoint, params=params)
    
    def get_order_history(self, inst_type: str = "SWAP", 
                         inst_id: Optional[str] = None,
                         begin: Optional[str] = None,
                         end: Optional[str] = None,
                         limit: int = 100) -> Dict:
        """
        Get order history
        
        Args:
            inst_type: Instrument type
            inst_id: Instrument ID
            begin: Start timestamp (ms)
            end: End timestamp (ms)
            limit: Number of results (max 100)
        
        Returns:
            Order history
        """
        endpoint = "/api/v5/trade/orders-history"
        params = {
            "instType": inst_type,
            "limit": str(limit)
        }
        if inst_id:
            params["instId"] = inst_id
        if begin:
            params["begin"] = begin
        if end:
            params["end"] = end
        return self._request("GET", endpoint, params=params)
    
    def get_fills_history(self, inst_type: str = "SWAP",
                         inst_id: Optional[str] = None,
                         begin: Optional[str] = None,
                         end: Optional[str] = None,
                         limit: int = 100) -> Dict:
        """
        Get transaction history
        
        Args:
            inst_type: Instrument type
            inst_id: Instrument ID
            begin: Start timestamp (ms)
            end: End timestamp (ms)
            limit: Number of results (max 100)
        
        Returns:
            Transaction history with fees and PnL
        """
        endpoint = "/api/v5/trade/fills-history"
        params = {
            "instType": inst_type,
            "limit": str(limit)
        }
        if inst_id:
            params["instId"] = inst_id
        if begin:
            params["begin"] = begin
        if end:
            params["end"] = end
        return self._request("GET", endpoint, params=params)
    
    # ==================== Market Data APIs ====================
    
    def get_ticker(self, inst_id: str) -> Dict:
        """Get ticker information"""
        endpoint = "/api/v5/market/ticker"
        params = {"instId": inst_id}
        return self._request("GET", endpoint, params=params)
    
    def get_instruments(self, inst_type: str = "SWAP") -> Dict:
        """Get available instruments"""
        endpoint = "/api/v5/public/instruments"
        params = {"instType": inst_type}
        return self._request("GET", endpoint, params=params)
