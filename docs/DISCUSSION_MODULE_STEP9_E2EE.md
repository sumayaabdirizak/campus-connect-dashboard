# Discussion Module - Step 9 End-to-End Encryption (E2E)

Step 9 is implemented as an E2E-capable backend contract where the server stores ciphertext and encrypted key envelopes, while clients own cryptographic keys.

## Core model

### Group-level E2E state (`DiscussionGroup`)

- `e2eeEnabled`
- `e2eeCurrentKeyVersion`
- `e2eeRotationRequired`

### Device public keys (`DiscussionDeviceKey`)

- `userId`
- `deviceId`
- `publicKey`
- `algorithm`
- `fingerprint`
- `revokedAt`

### Encrypted group-key distribution (`DiscussionGroupKeyEnvelope`)

- `groupId`
- `keyVersion`
- `userId`
- `deviceId`
- `encryptedKey`
- `nonce`
- `algorithm`

### Ciphertext message fields (`DiscussionMessage`)

- `ciphertext`
- `nonce`
- `keyVersion`
- `senderDeviceId`

## Key strategy and distribution

- Each group tracks current key version.
- Clients register device public keys.
- Moderators publish encrypted key envelopes per device for a key version.
- Clients fetch envelopes for their device when joining/fetching keys.

## Key rotation behavior

- Membership removals mark `e2eeRotationRequired = true`.
- Moderator publishes next key epoch (`keyVersion`) and envelopes.
- Group updates:
  - `e2eeCurrentKeyVersion = newVersion`
  - `e2eeRotationRequired = false`

Old messages remain on old key versions.

## Attachment encryption contract

- For E2E-enabled groups, uploads require encrypted metadata:
  - `ciphertextHash`
  - `keyVersion`
  - `nonce`
- Message carries encrypted payload (`ciphertext`) and links encrypted attachments.

## REST endpoints

### Device key registration

- `POST /api/discussions/me/e2e/devices`

Body:

- `deviceId`
- `publicKey`
- `algorithm` (optional)

### Fetch encrypted group keys

- `GET /api/discussions/groups/:groupId/e2e/keys?deviceId=<id>&fromVersion=<n>`

Returns:

- group key version metadata
- encrypted envelopes for that user+device

### Publish key epoch (moderator)

- `POST /api/discussions/groups/:groupId/e2e/epochs`

Body:

- `keyVersion`
- `algorithm`
- `envelopes[]` (`userId`, `deviceId`, `encryptedKey`, `nonce`)
- `rotationReason` (optional)

## WebSocket support

### `join:group`

- Returns E2E state metadata:
  - `e2eeEnabled`
  - `e2eeCurrentKeyVersion`
  - `e2eeRotationRequired`
- If `deviceId` is provided, includes pending key envelopes for that device.

### `message:send`

For E2E-enabled groups, requires:

- `e2e.ciphertext`
- `e2e.nonce`
- `e2e.keyVersion`
- `e2e.senderDeviceId`

Server stores ciphertext fields and does not require plaintext content.

## Notes

- Cryptographic operations (encrypt/decrypt/key wrapping) are client-side responsibilities.
- Server acts as secure transport/storage for encrypted envelopes and ciphertext.
- This step provides robust backend primitives for full client-side E2E implementation.
