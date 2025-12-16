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
        # Build kwargs for additional parameters
        order_kwargs = {}
        
        if px:
            order_kwargs["px"] = px
        if pos_side:
            order_kwargs["pos_side"] = pos_side
        
        # Add inline stop loss and take profit if provided
        if sl_trigger_px:
            order_kwargs["slTriggerPx"] = sl_trigger_px
            if sl_ord_px:
                order_kwargs["slOrdPx"] = sl_ord_px
        
        if tp_trigger_px:
            order_kwargs["tpTriggerPx"] = tp_trigger_px
            if tp_ord_px:
                order_kwargs["tpOrdPx"] = tp_ord_px
        
        # Call place_order with positional arguments
        main_order = self.client.place_order(
            inst_id=inst_id,
            td_mode=td_mode,
            side=side,
            ord_type=ord_type,
            sz=size,
            **order_kwargs
        )
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
                               pos_side: Optional[str] = None,
                               sl_trigger_px: Optional[str] = None,
                               tp_trigger_px: Optional[str] = None) -> Dict:
        """
        Place conditional order (trigger order) with optional stop-loss and take-profit
        
        Args:
            inst_id: Instrument ID
            side: 'buy' or 'sell'
            sz: Order size
            trigger_px: Trigger price
            order_px: Order price ('-1' for market order)
            td_mode: Trade mode
            pos_side: Position side
            sl_trigger_px: Stop-loss trigger price
            tp_trigger_px: Take-profit trigger price
        
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
        
        # Add stop-loss and take-profit if provided
        if sl_trigger_px:
            params["slTriggerPx"] = sl_trigger_px
            params["slOrdPx"] = "-1"  # Market order for stop-loss
        
        if tp_trigger_px:
            params["tpTriggerPx"] = tp_trigger_px
            params["tpOrdPx"] = "-1"  # Market order for take-profit
        
        return self.client.place_algo_order(**params)
    
    def get_pnl_summary(self, inst_type: str = "SWAP", 
                       begin: Optional[str] = None,
                       end: Optional[str] = None) -> Dict:
        """
        Get profit and loss summary using Bills API
        
        Bills API provides accurate P&L data including:
        - Trade profits/losses (type=2)
        - Funding fees (type=8)
        - Interest (type=7)
        - All balance changes
        
        Args:
            inst_type: Instrument type
            begin: Start timestamp (ms)
            end: End timestamp (ms)
        
        Returns:
            PnL summary with accurate realized P&L and fees
        """
        # Get bills from account (all balance changes)
        bills = self.client.get_bills(
            inst_type=inst_type,
            begin=begin,
            end=end,
            limit=100
        )
        
        if bills.get("code") != "0":
            return bills
        
        # Calculate summary from bills
        total_pnl = 0
        total_fee = 0
        total_funding_fee = 0
        balance_change = 0
        trades = []
        
        for bill in bills.get("data", []):
            bill_type = bill.get("type", "")
            pnl = float(bill.get("pnl", 0) or 0)
            fee = float(bill.get("fee", 0) or 0)
            bal_chg = float(bill.get("balChg", 0) or 0)
            
            # Type 2 = Trade
            # Type 8 = Funding fee
            # Type 7 = Interest deduction
            if bill_type in ["2", "8", "7"]:
                total_pnl += pnl
                
                if bill_type == "8":  # Funding fee
                    total_funding_fee += bal_chg
                
                # Fee is negative for charges, positive for rebates
                total_fee += abs(fee)
                balance_change += bal_chg
                
                trades.append({
                    "instId": bill.get("instId"),
                    "type": bill_type,
                    "subType": bill.get("subType"),
                    "pnl": pnl,
                    "fee": fee,
                    "balChg": bal_chg,
                    "ts": bill.get("ts"),
                    "px": bill.get("px"),
                    "sz": bill.get("sz")
                })
        
        # Calculate net P&L
        # Net P&L = Total balance change (includes all P&L and fees)
        # Or: Net P&L = Total PnL - Total Fee + Funding Fee
        net_pnl = balance_change
        
        return {
            "code": "0",
            "msg": "Success",
            "data": {
                "total_pnl": balance_change,  # Use balance_change as total realized P&L
                "total_fee": total_fee,
                "funding_fee": total_funding_fee,
                "net_pnl": net_pnl,
                "trade_count": len(trades),
                "trades": trades
            }
        }
    
    def close_all_positions(self, inst_type: str = "SWAP") -> Dict:
        """
        Close all positions with market orders
        
        Args:
            inst_type: Instrument type (default: SWAP)
        
        Returns:
            Results of closing all positions
        """
        # Get all current positions
        positions = self.client.get_positions(inst_type=inst_type)
        
        if positions.get("code") != "0":
            return positions
        
        results = []
        positions_data = positions.get("data", [])
        
        if not positions_data:
            return {
                "code": "0",
                "msg": "No positions to close",
                "data": {
                    "success_count": 0,
                    "failed_count": 0,
                    "results": []
                }
            }
        
        success_count = 0
        failed_count = 0
        
        for pos in positions_data:
            inst_id = pos.get("instId")
            pos_side = pos.get("posSide")
            avail_pos = pos.get("availPos", "0")
            
            # Skip if no available position to close
            if float(avail_pos) <= 0:
                continue
            
            # Determine order side (opposite of position side)
            # For long positions, we sell; for short positions, we buy
            if pos_side == "long":
                order_side = "sell"
            elif pos_side == "short":
                order_side = "buy"
            else:
                # For net mode (posSide is "net"), check pos sign
                pos_amount = float(pos.get("pos", "0"))
                if pos_amount > 0:
                    order_side = "sell"
                else:
                    order_side = "buy"
            
            # Place market order to close position
            try:
                result = self.client.place_order(
                    inst_id=inst_id,
                    td_mode=pos.get("mgnMode", "cross"),
                    side=order_side,
                    ord_type="market",
                    sz=avail_pos,
                    reduce_only=True,
                    pos_side=pos_side if pos_side in ["long", "short"] else None
                )
                
                if result.get("code") == "0":
                    success_count += 1
                    results.append({
                        "instId": inst_id,
                        "posSide": pos_side,
                        "size": avail_pos,
                        "status": "success",
                        "orderId": result.get("data", [{}])[0].get("ordId"),
                        "message": "Position closed successfully"
                    })
                else:
                    failed_count += 1
                    results.append({
                        "instId": inst_id,
                        "posSide": pos_side,
                        "size": avail_pos,
                        "status": "failed",
                        "message": result.get("msg", "Unknown error")
                    })
            except Exception as e:
                failed_count += 1
                results.append({
                    "instId": inst_id,
                    "posSide": pos_side,
                    "size": avail_pos,
                    "status": "failed",
                    "message": str(e)
                })
        
        return {
            "code": "0",
            "msg": f"Closed {success_count} positions, {failed_count} failed",
            "data": {
                "success_count": success_count,
                "failed_count": failed_count,
                "results": results
            }
        }
