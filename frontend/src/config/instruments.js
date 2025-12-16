/**
 * Configured trading instruments (SWAP perpetual contracts only)
 */

// List of allowed trading pairs
export const ALLOWED_INSTRUMENTS = [
  'BTC-USDT-SWAP',
  'ETH-USDT-SWAP',
  'XRP-USDT-SWAP',
  'BNB-USDT-SWAP',
  'SOL-USDT-SWAP',
  'LTC-USDT-SWAP',
  'DOGE-USDT-SWAP',
  'SUI-USDT-SWAP',
  'TRX-USDT-SWAP',
  'TON-USDT-SWAP',
  'ETC-USDT-SWAP',
  'BCH-USDT-SWAP',
  'HBAR-USDT-SWAP',
  'XLM-USDT-SWAP',
  'FIL-USDT-SWAP',
  'LINK-USDT-SWAP',
  'CRO-USDT-SWAP',
  'DOT-USDT-SWAP',
  'AAVE-USDT-SWAP',
  'UNI-USDT-SWAP',
  'NEAR-USDT-SWAP',
  'APT-USDT-SWAP',
  'CFX-USDT-SWAP',
  'CRV-USDT-SWAP',
  'STX-USDT-SWAP',
  'LDO-USDT-SWAP',
  'TAO-USDT-SWAP'
];

// Get short name from instrument ID (e.g., 'BTC-USDT-SWAP' -> 'BTC')
export const getShortName = (instId) => {
  return instId.split('-')[0];
};

// Check if instrument is allowed
export const isAllowedInstrument = (instId) => {
  return ALLOWED_INSTRUMENTS.includes(instId);
};

// Filter instruments list
export const filterInstruments = (instruments) => {
  if (!instruments || !Array.isArray(instruments)) return [];
  return instruments.filter(inst => isAllowedInstrument(inst.instId));
};
