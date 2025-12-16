"""
Pydantic models for API request/response validation
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class OrderRequest(BaseModel):
    """Order placement request"""
    account_names: List[str] = Field(..., description="List of account names")
    inst_id: str = Field(..., description="Instrument ID (e.g., BTC-USDT-SWAP)")
    side: str = Field(..., description="Order side: buy or sell")
    ord_type: str = Field(default="market", description="Order type: market or limit")
    sz: Optional[str] = Field(None, description="Order size (contracts)")
    px: Optional[str] = Field(None, description="Order price (for limit orders)")
    td_mode: str = Field(default="cross", description="Trade mode: cross or isolated")
    pos_side: Optional[str] = Field(None, description="Position side: long or short")
    sl_trigger_px: Optional[str] = Field(None, description="Stop loss trigger price")
    sl_ord_px: Optional[str] = Field(None, description="Stop loss order price")
    tp_trigger_px: Optional[str] = Field(None, description="Take profit trigger price")
    tp_ord_px: Optional[str] = Field(None, description="Take profit order price")


class PercentageOrderRequest(BaseModel):
    """Order placement by percentage of balance"""
    account_names: List[str] = Field(..., description="List of account names")
    inst_id: str = Field(..., description="Instrument ID")
    side: str = Field(..., description="Order side: buy or sell")
    percentage: int = Field(..., description="Percentage of balance: 10, 20, 25, 33, 50, 66, 100")
    current_price: float = Field(..., description="Current market price")
    leverage: int = Field(default=1, description="Leverage multiplier")
    ord_type: str = Field(default="market", description="Order type")
    td_mode: str = Field(default="cross", description="Trade mode")
    pos_side: Optional[str] = Field(None, description="Position side")
    sl_trigger_px: Optional[str] = Field(None, description="Stop loss trigger price")
    tp_trigger_px: Optional[str] = Field(None, description="Take profit trigger price")


class ConditionalOrderRequest(BaseModel):
    """Conditional order request"""
    account_names: List[str] = Field(..., description="List of account names")
    inst_id: str = Field(..., description="Instrument ID")
    side: str = Field(..., description="Order side: buy or sell")
    sz: str = Field(..., description="Order size")
    trigger_px: str = Field(..., description="Trigger price")
    order_px: str = Field(default="-1", description="Order price (-1 for market)")
    td_mode: str = Field(default="cross", description="Trade mode")
    pos_side: Optional[str] = Field(None, description="Position side")
    sl_trigger_px: Optional[str] = Field(None, description="Stop-loss trigger price")
    tp_trigger_px: Optional[str] = Field(None, description="Take-profit trigger price")


class LeverageRequest(BaseModel):
    """Leverage setting request"""
    account_names: List[str] = Field(..., description="List of account names")
    inst_id: str = Field(..., description="Instrument ID")
    lever: int = Field(..., description="Leverage (1-125)")
    mgn_mode: str = Field(default="cross", description="Margin mode: cross or isolated")
    pos_side: Optional[str] = Field(None, description="Position side")


class CancelOrderRequest(BaseModel):
    """Cancel order request"""
    account_names: List[str] = Field(..., description="List of account names")
    inst_id: Optional[str] = Field(None, description="Instrument ID (optional)")


class HistoryRequest(BaseModel):
    """History query request"""
    account_names: Optional[List[str]] = Field(None, description="List of account names")
    inst_type: str = Field(default="SWAP", description="Instrument type")
    inst_id: Optional[str] = Field(None, description="Instrument ID")
    begin: Optional[str] = Field(None, description="Start timestamp (ms)")
    end: Optional[str] = Field(None, description="End timestamp (ms)")
    limit: int = Field(default=100, description="Number of results")
