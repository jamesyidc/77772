"""
FastAPI Routes for OKX Trading System
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
from backend.models.schemas import (
    OrderRequest, PercentageOrderRequest, ConditionalOrderRequest,
    LeverageRequest, CancelOrderRequest, HistoryRequest
)
from backend.services.account_manager import account_manager
from backend.services.trading_service import TradingService

router = APIRouter()


# ==================== Account Management ====================

@router.get("/accounts")
async def get_accounts():
    """Get list of all configured accounts"""
    accounts = account_manager.get_all_accounts()
    return {
        "code": "0",
        "msg": "Success",
        "data": {
            "accounts": accounts,
            "count": len(accounts)
        }
    }


@router.get("/balance")
async def get_balance(account_names: Optional[str] = None, ccy: Optional[str] = None):
    """
    Get account balance
    
    Query params:
        account_names: Comma-separated account names (optional, default: all)
        ccy: Currency (optional, e.g., USDT)
    """
    accounts = account_names.split(",") if account_names else None
    
    if accounts and len(accounts) == 1:
        # Single account - wrap in consistent format
        account = account_manager.get_account(accounts[0])
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        balance = account.get_balance(ccy=ccy)
        return {
            "code": "0",
            "msg": "Success",
            "data": {
                accounts[0]: balance
            }
        }
    else:
        # Multiple accounts
        balances = account_manager.get_all_balances(accounts)
        return {
            "code": "0",
            "msg": "Success",
            "data": balances
        }


@router.get("/positions")
async def get_positions(account_names: Optional[str] = None, 
                       inst_type: str = "SWAP",
                       inst_id: Optional[str] = None):
    """
    Get positions
    
    Query params:
        account_names: Comma-separated account names (optional)
        inst_type: Instrument type (default: SWAP)
        inst_id: Instrument ID (optional)
    """
    accounts = account_names.split(",") if account_names else None
    
    if accounts and len(accounts) == 1:
        # Single account - wrap in consistent format
        account = account_manager.get_account(accounts[0])
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        positions = account.get_positions(inst_type=inst_type, inst_id=inst_id)
        return {
            "code": "0",
            "msg": "Success",
            "data": {
                accounts[0]: positions
            }
        }
    else:
        # Multiple accounts
        positions = account_manager.get_all_positions(accounts, inst_type=inst_type)
        return {
            "code": "0",
            "msg": "Success",
            "data": positions
        }


@router.get("/pending-orders")
async def get_pending_orders(account_names: Optional[str] = None,
                            inst_type: str = "SWAP",
                            inst_id: Optional[str] = None):
    """Get pending orders (including conditional orders)"""
    accounts = account_names.split(",") if account_names else None
    
    if accounts and len(accounts) == 1:
        # Single account
        account = account_manager.get_account(accounts[0])
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        regular_orders = account.get_pending_orders(inst_type=inst_type, inst_id=inst_id)
        algo_orders = account.get_algo_orders(inst_type=inst_type, inst_id=inst_id)
        
        return {
            "code": "0",
            "msg": "Success",
            "data": {
                "regular_orders": regular_orders,
                "algo_orders": algo_orders
            }
        }
    else:
        # Multiple accounts
        orders = account_manager.get_all_pending_orders(accounts, inst_type=inst_type)
        return {
            "code": "0",
            "msg": "Success",
            "data": orders
        }


# ==================== Trading Operations ====================

@router.post("/order/place")
async def place_order(request: OrderRequest):
    """Place order on specified accounts"""
    results = {}
    
    for account_name in request.account_names:
        account = account_manager.get_account(account_name)
        if not account:
            results[account_name] = {
                "code": "-1",
                "msg": f"Account {account_name} not found"
            }
            continue
        
        trading_service = TradingService(account)
        
        # Prepare order parameters
        order_params = {
            "inst_id": request.inst_id,
            "side": request.side,
            "ord_type": request.ord_type,
            "td_mode": request.td_mode,
            "size": request.sz
        }
        
        if request.px:
            order_params["px"] = request.px
        if request.pos_side:
            order_params["pos_side"] = request.pos_side
        if request.sl_trigger_px:
            order_params["sl_trigger_px"] = request.sl_trigger_px
        if request.sl_ord_px:
            order_params["sl_ord_px"] = request.sl_ord_px
        if request.tp_trigger_px:
            order_params["tp_trigger_px"] = request.tp_trigger_px
        if request.tp_ord_px:
            order_params["tp_ord_px"] = request.tp_ord_px
        
        result = trading_service.open_position_with_sl_tp(**order_params)
        results[account_name] = result
    
    return {
        "code": "0",
        "msg": "Success",
        "data": results
    }


@router.post("/order/place-by-percentage")
async def place_order_by_percentage(request: PercentageOrderRequest):
    """Place order by percentage of available balance"""
    results = {}
    
    for account_name in request.account_names:
        account = account_manager.get_account(account_name)
        if not account:
            results[account_name] = {
                "code": "-1",
                "msg": f"Account {account_name} not found"
            }
            continue
        
        trading_service = TradingService(account)
        
        kwargs = {}
        if request.pos_side:
            kwargs["pos_side"] = request.pos_side
        if request.sl_trigger_px:
            kwargs["sl_trigger_px"] = request.sl_trigger_px
        if request.tp_trigger_px:
            kwargs["tp_trigger_px"] = request.tp_trigger_px
        
        result = trading_service.open_position_by_percentage(
            inst_id=request.inst_id,
            side=request.side,
            percentage=request.percentage,
            current_price=request.current_price,
            ord_type=request.ord_type,
            td_mode=request.td_mode,
            leverage=request.leverage,
            **kwargs
        )
        results[account_name] = result
    
    return {
        "code": "0",
        "msg": "Success",
        "data": results
    }


@router.post("/order/conditional")
async def place_conditional_order(request: ConditionalOrderRequest):
    """Place conditional order"""
    results = {}
    
    for account_name in request.account_names:
        account = account_manager.get_account(account_name)
        if not account:
            results[account_name] = {
                "code": "-1",
                "msg": f"Account {account_name} not found"
            }
            continue
        
        trading_service = TradingService(account)
        result = trading_service.place_conditional_order(
            inst_id=request.inst_id,
            side=request.side,
            sz=request.sz,
            trigger_px=request.trigger_px,
            order_px=request.order_px,
            td_mode=request.td_mode,
            pos_side=request.pos_side,
            sl_trigger_px=request.sl_trigger_px,
            tp_trigger_px=request.tp_trigger_px
        )
        results[account_name] = result
    
    return {
        "code": "0",
        "msg": "Success",
        "data": results
    }


@router.post("/leverage/set")
async def set_leverage(request: LeverageRequest):
    """Set leverage for specified accounts"""
    results = account_manager.set_leverage_multi(
        account_names=request.account_names,
        inst_id=request.inst_id,
        lever=request.lever,
        mgn_mode=request.mgn_mode
    )
    
    return {
        "code": "0",
        "msg": "Success",
        "data": results
    }


@router.post("/order/cancel-all")
async def cancel_all_orders(request: CancelOrderRequest):
    """Cancel all pending orders (including conditional orders)"""
    results = account_manager.cancel_all_orders_multi(
        account_names=request.account_names,
        inst_id=request.inst_id
    )
    
    return {
        "code": "0",
        "msg": "Success",
        "data": results
    }


# ==================== History & Analytics ====================

@router.post("/history/orders")
async def get_order_history(request: HistoryRequest):
    """Get order history"""
    results = {}
    accounts = request.account_names or account_manager.get_all_accounts()
    
    for account_name in accounts:
        account = account_manager.get_account(account_name)
        if not account:
            results[account_name] = {
                "code": "-1",
                "msg": f"Account {account_name} not found"
            }
            continue
        
        history = account.get_order_history(
            inst_type=request.inst_type,
            inst_id=request.inst_id,
            begin=request.begin,
            end=request.end,
            limit=request.limit
        )
        results[account_name] = history
    
    return {
        "code": "0",
        "msg": "Success",
        "data": results
    }


@router.post("/history/fills")
async def get_fills_history(request: HistoryRequest):
    """Get transaction history with fees"""
    results = {}
    accounts = request.account_names or account_manager.get_all_accounts()
    
    for account_name in accounts:
        account = account_manager.get_account(account_name)
        if not account:
            results[account_name] = {
                "code": "-1",
                "msg": f"Account {account_name} not found"
            }
            continue
        
        fills = account.get_fills_history(
            inst_type=request.inst_type,
            inst_id=request.inst_id,
            begin=request.begin,
            end=request.end,
            limit=request.limit
        )
        results[account_name] = fills
    
    return {
        "code": "0",
        "msg": "Success",
        "data": results
    }


@router.post("/analytics/pnl")
async def get_pnl_summary(request: HistoryRequest):
    """Get profit/loss summary"""
    results = {}
    accounts = request.account_names or account_manager.get_all_accounts()
    
    for account_name in accounts:
        account = account_manager.get_account(account_name)
        if not account:
            results[account_name] = {
                "code": "-1",
                "msg": f"Account {account_name} not found"
            }
            continue
        
        trading_service = TradingService(account)
        pnl = trading_service.get_pnl_summary(
            inst_type=request.inst_type,
            begin=request.begin,
            end=request.end
        )
        results[account_name] = pnl
    
    return {
        "code": "0",
        "msg": "Success",
        "data": results
    }


# ==================== Market Data ====================

@router.get("/market/ticker")
async def get_ticker(inst_id: str):
    """Get ticker information"""
    # Use first available account for market data
    accounts = account_manager.get_all_accounts()
    if not accounts:
        raise HTTPException(status_code=500, detail="No accounts configured")
    
    account = account_manager.get_account(accounts[0])
    return account.get_ticker(inst_id=inst_id)


@router.get("/market/instruments")
async def get_instruments(inst_type: str = "SWAP"):
    """Get available instruments"""
    accounts = account_manager.get_all_accounts()
    if not accounts:
        raise HTTPException(status_code=500, detail="No accounts configured")
    
    account = account_manager.get_account(accounts[0])
    return account.get_instruments(inst_type=inst_type)
