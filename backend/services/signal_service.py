"""
Trading Signal Service
Fetches and manages trading signals from external source
"""
import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import os
from dotenv import load_dotenv

load_dotenv()


class SignalService:
    def __init__(self):
        self.signal_source_url = os.getenv('SIGNAL_SOURCE_URL', '')
        self.signals_cache = []
        self.last_fetch_time = None
        self.cache_duration = timedelta(hours=1)  # Cache signals for 1 hour
        
    async def fetch_signals(self) -> List[Dict]:
        """
        Fetch trading signals from the signal source
        Returns list of signal dictionaries
        """
        if not self.signal_source_url:
            return []
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.signal_source_url,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Process and normalize the signal data
                        return self._process_signals(data)
                    else:
                        print(f"Failed to fetch signals: HTTP {response.status}")
                        return []
        except asyncio.TimeoutError:
            print("Signal fetch timeout")
            return []
        except Exception as e:
            print(f"Error fetching signals: {str(e)}")
            return []
    
    def _process_signals(self, raw_data: Dict) -> List[Dict]:
        """
        Process raw signal data into standardized format
        Expected format from signal source:
        {
            "signals": [
                {
                    "symbol": "BTC-USDT-SWAP",
                    "signal": "BUY" or "SELL",
                    "price": "43250.5",
                    "timestamp": "2024-12-16T12:00:00",
                    "reason": "Support level"
                }
            ]
        }
        """
        processed = []
        signals_list = raw_data.get('signals', []) if isinstance(raw_data, dict) else []
        
        for signal in signals_list:
            try:
                processed_signal = {
                    'symbol': signal.get('symbol', ''),
                    'signal': signal.get('signal', '').upper(),
                    'price': float(signal.get('price', 0)),
                    'timestamp': signal.get('timestamp', datetime.now().isoformat()),
                    'reason': signal.get('reason', ''),
                    'id': f"{signal.get('symbol')}_{signal.get('timestamp')}_{signal.get('signal')}"
                }
                processed.append(processed_signal)
            except (ValueError, TypeError) as e:
                print(f"Error processing signal: {e}")
                continue
        
        return processed
    
    async def get_signals(self, force_refresh: bool = False) -> Dict:
        """
        Get trading signals with caching
        Returns signals from last 1 hour, deduplicated
        """
        now = datetime.now()
        
        # Check if we need to refresh
        should_refresh = (
            force_refresh or 
            self.last_fetch_time is None or 
            (now - self.last_fetch_time) > timedelta(seconds=30)
        )
        
        if should_refresh:
            new_signals = await self.fetch_signals()
            
            # Add new signals to cache
            for signal in new_signals:
                # Convert timestamp to datetime for filtering
                try:
                    signal_time = datetime.fromisoformat(signal['timestamp'].replace('Z', '+00:00'))
                    signal['datetime'] = signal_time
                except:
                    signal['datetime'] = now
                
                # Add only if not duplicate
                if not any(s['id'] == signal['id'] for s in self.signals_cache):
                    self.signals_cache.append(signal)
            
            # Remove signals older than 1 hour
            cutoff_time = now - self.cache_duration
            self.signals_cache = [
                s for s in self.signals_cache 
                if s.get('datetime', now) > cutoff_time
            ]
            
            self.last_fetch_time = now
        
        # Prepare response
        return {
            'code': '0',
            'msg': 'Success',
            'data': {
                'signals': sorted(
                    self.signals_cache,
                    key=lambda x: x.get('datetime', now),
                    reverse=True
                ),
                'total_count': len(self.signals_cache),
                'last_update': self.last_fetch_time.isoformat() if self.last_fetch_time else None,
                'source_url': self.signal_source_url
            }
        }
    
    def update_signal_source(self, new_url: str) -> Dict:
        """
        Update the signal source URL
        """
        self.signal_source_url = new_url
        # Clear cache when source changes
        self.signals_cache = []
        self.last_fetch_time = None
        
        # Update .env file
        try:
            env_path = '.env'
            with open(env_path, 'r') as f:
                lines = f.readlines()
            
            # Update or add SIGNAL_SOURCE_URL
            updated = False
            for i, line in enumerate(lines):
                if line.startswith('SIGNAL_SOURCE_URL='):
                    lines[i] = f'SIGNAL_SOURCE_URL={new_url}\n'
                    updated = True
                    break
            
            if not updated:
                lines.append(f'\nSIGNAL_SOURCE_URL={new_url}\n')
            
            with open(env_path, 'w') as f:
                f.writelines(lines)
            
            return {
                'code': '0',
                'msg': 'Signal source URL updated successfully',
                'data': {'new_url': new_url}
            }
        except Exception as e:
            return {
                'code': '1',
                'msg': f'Failed to update signal source: {str(e)}'
            }


# Global instance
signal_service = SignalService()
