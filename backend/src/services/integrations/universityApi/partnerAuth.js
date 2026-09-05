import crypto from 'crypto';

/**
 * Partner signature per Jazeera AIS docs:
 * signature = SHA-512(api_key + timestamp)
 * Authorization = base64(partner_code + ":" + signature)
 */
export function buildPartnerAuthHeaders({ apiKey, partnerCode, timestampSeconds }) {
  const ts =
    timestampSeconds != null
      ? String(timestampSeconds)
      : String(Math.floor(Date.now() / 1000));
  const signature = crypto
    .createHash('sha512')
    .update(String(apiKey) + ts)
    .digest('hex');
  const authorization = Buffer.from(`${partnerCode}:${signature}`, 'utf8').toString('base64');
  return {
    Authorization: authorization,
    'X-Timestamp': ts,
  };
}
