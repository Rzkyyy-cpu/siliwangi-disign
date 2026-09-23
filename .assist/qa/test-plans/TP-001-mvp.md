# TP-001 MVP Digital Signature

## Required cases

| ID | Case | Expected |
| --- | --- | --- |
| TC-001 | SHA-256 known PDF | Digest matches fixture |
| TC-002 | Sign and verify original PDF | Valid |
| TC-003 | Change one PDF byte | Rejected by hash mismatch |
| TC-004 | Change signature | Rejected |
| TC-005 | Use wrong public key | Rejected |
| TC-006 | Alter QR hash | Rejected |
| TC-007 | Fake unsigned QR payload | Rejected |
| TC-008 | Malformed or oversized envelope | Rejected safely |
| TC-009 | Measure sign/verify 30 times | Report average and distribution |
| TC-010 | Record signature/public key size | Report bytes |

All fixtures must be synthetic. No private key or real personal document may be committed.
