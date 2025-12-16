"""
Trading Service - High-level trading operations
"""
from typing import Dict, List, Optional
from backend.services.okx_client import OKXClient
from backend.config.config import config


class TradingService:
    """High-level trading operations with stop loss and take profit"""
    
    def __init__(self, client: OKXClient):
        self.client = client
    
    def calculate_position_size(self, balance: float, percentage: int) -> float:
        """
        Calculate position size based on percentage of balance
        
        Args:
            balance: Available balance
            percentage: Percentage (10, 20, 25, 33, 50, 66, 100)
        
        Returns:
            Position size
        """
        if percentage not in config.POSITION_SIZE_PRESETS:
            raise ValueError(f"Invalid percentage. Must be one of {config.POSITION_SIZE_PRESETS}")
        
        return balance * (percentage / 100.0)
    
    def open_position_with_sl_tp(self, inst_id: str, side: str, size: str,
                                 ord_type: str = "market", px: Optional[str] = None,
                                 td_mode: str = "cross", pos_side: Optional[str] = None,
                                 sl_trigger_px: Optional[str] = None,
                                 sl_ord_px: Optional[str] = None,
                                 tp_trigger_px: Optional[str] = None,
                                 tp_ord_px: Optional[str] = None) -> Dict:
        """
        Open position with stop loss and take profit
        
        Args:
            inst_id: Instrument ID (e.g., 'BTC-USDT-SWAP')
            side: 'buy' or 'sell'
            size: Position size
            ord_type: Order type ('market' or 'limit')
            px: Price (for limit orders)
            td_mode: Trade mode ('cross' or 'isolated')
            pos_side: Position side ('long' or 'short' for hedge mode)
            sl_trigger_px: Stop loss trigger price
            sl_ord_px: Stop loss order price (use '-1' for market)
            tp_trigger_px: Take profit trigger price
            tp_ord_px: Take profit order price (use '-1' for market)
        
        Returns:
            Combined result of main order and SL/TP orders
        """
        result = {
            "main_order": None,
            "stop_loss": None,
            "take_profit": None
        }
        
        # Place main order
        order_params = {
            "instId": inst_id,
            "tdMode": td_mode,
            "side": side,
            "ordType": ord_type,
            "sz": size
        }
        
        if px:
            order_params["px"] = px
        if pos_side:
            order_params["posSide"] = pos_side
        
        # Add inline stop loss and take profit if provided
        if sl_trigger_px:
            order_params["slTriggerPx"] = sl_trigger_px
            if sl_ord_px:
                order_params["slOrdPx"] = sl_ord_px
        
        if tp_trigger_px:
            order_params["tpTriggerPx"] = tp_trigger_px
            if tp_ord_px:
                order_params["tpOrdPx"] = tp_ord_px
        
        main_order = self.client.place_order(**order_params)
        result["main_order"] = main_order
        
        # If main order succeeded and SL/TP not included inline, place algo orders
        if main_order.get("code") == "0" and not (sl_trigger_px or tp_trigger_px):
            close_side = "sell" if side == "buy" else "buy"
            
            # Place stop loss algo order
            if sl_trigger_px:
                sl_params = {
                    "instId": inst_id,
                    "tdMode": td_mode,
                    "side": close_side,
                    "ordType": "conditional",
                    "sz": size,
                    "triggerPx": sl_trigger_px,
                    "orderPx": sl_ord_px or "-1"
                }
                if pos_side:
                    sl_params["posSide"] = pos_side
                
                stop_loss = self.client.place_algo_order(**sl_params)
                result["stop_loss"] = stop_loss
            
            # Place take profit algo order
            if tp_trigger_px:
                tp_params = {
                    "instId": inst_id,
                    "tdMode": td_mode,
                    "side": close_side,
                    "ordType": "conditional",
                    "sz": size,
                    "triggerPx": tp_trigger_px,
                    "orderPx": tp_ord_px or "-1"
                }
                if pos_side:
                    tp_params["posSide"] = pos_side
                
                take_profit = self.client.place_algo_order(**tp_params)
                result["take_profit"] = take_profit
        
        return result
    
    def open_position_by_percentage(self, inst_id: str, side: str, percentage: int,
                                   current_price: float, ord_type: str = "market",
                                   td_mode: str = "cross", leverage: int = 1,
                                   **kwargs) -> Dict:
        """
        Open position by percentage of available balance
        
        Args:
            inst_id: Instrument ID
            side: 'buy' or 'sell'
            percentage: Percentage of balance (10, 20, 25, 33, 50, 66, 100)
            current_price: Current market price
            ord_type: Order type
            td_mode: Trade mode
            leverage: Leverage multiplier
            **kwargs: Additional parameters (sl_trigger_px, tp_trigger_px, etc.)
        
        Returns:
            Order result
        """
        # Get available balance
        balance_data = self.client.get_balance()
        if balance_data.get("code") != "0":
            return balance_data
        
        # Extract USDT balance (assuming USDT as base currency)
        available_balance = 0
        for detail in balance_data.get("data", []):
            for currency in detail.get("details", []):
                if currency.get("ccy") == "USDT":
                    available_balance = float(currency.get("availBal", 0))
                    break
        
        if available_balance == 0:
            return {
                "code": "-1",
                "msg": "No available balance",
                "data": []
            }
        
        # Calculate position size
        position_value = self.calculate_position_size(available_balance, percentage)
        position_value_with_leverage = position_value * leverage
        
        # Calculate contracts (for SWAP, size is in contracts)
        # Assuming each contract value is based on the instrument
        # For BTC-USDT-SWAP, 1 contract = 1 USD
        size = str(int(position_value_with_leverage / current_price))
        
        # Open position with optional SL/TP
        return self.open_position_with_sl_tp(
            inst_id=inst_id,
            side=side,
            size=size,
            ord_type=ord_type,
            td_mode=td_mode,
            **kwargs
        )
    
    def place_conditional_order(self, inst_id: str, side: str, sz: str,
                               trigger_px: str, order_px: str = "-1",
                               td_mode: str = "cross",
                               pos_side: Optional[str] = None) -> Dict:
        """
        Place conditional order (trigger order)
        
        Args:
            inst_id: Instrument ID
            side: 'buy' or 'sell'
            sz: Order size
            trigger_px: Trigger price
            order_px: Order price ('-1' for market order)
            td_mode: Trade mode
            pos_side: Position side
        
        Returns:
            Order result
        """
        params = {
            "instId": inst_id,
            "tdMode": td_mode,
            "side": side,
            "ordType": "conditional",
            "sz": sz,
            "triggerPx": trigger_px,
            "orderPx": order_px
        }
        
        if pos_side:
            params["posSide"] = pos_side
        
        return self.client.place_algo_order(**params)
    
    def get_pnl_summary(self, inst_type: str = "SWAP", 
                       begin: Optional[str] = None,
                       end: Optional[str] = None) -> Dict:
        """
        Get profit and loss summary with transaction details
        
        Args:
            inst_type: Instrument type
            begin: Start timestamp (ms)
            end: End timestamp (ms)
        
        Returns:
            PnL summary with fees
        """
        fills = self.client.get_fills_history(
            inst_type=inst_type,
            begin=begin,
            end=end,
            limit=100
        )
        
        if fills.get("code") != "0":
            return fills
        
        # Calculate summary
        total_pnl = 0
        total_fee = 0
        trades = []
        
        for fill in fills.get("data", []):
            pnl = float(fill.get("pnl", 0))
            fee = float(fill.get("fee", 0))
            
            total_pnl += pnl
            total_fee += abs(fee)
            
            trades.append({
                "instId": fill.get("instId"),
                "side": fill.get("side"),
                "fillSz": fill.get("fillSz"),
                "fillPx": fill.get("fillPx"),
                "pnl": pnl,
                "fee": fee,
                "ts": fill.get("ts")
            })
        
        return {
            "code": "0",
            "msg": "Success",
            "data": {
                "total_pnl": total_pnl,
                "total_fee": total_fee,
                "net_pnl": total_pnl - total_fee,
                "trade_count": len(trades),
                "trades": trades
            }
        }
