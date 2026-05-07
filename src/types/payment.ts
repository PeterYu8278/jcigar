/**
 * Billplz Payment Gateway Configuration
 * Documentation: https://www.billplz.com/api
 */

export interface BillplzConfig {
  apiKey?: string;
  xSignatureKey?: string;
  collectionId?: string;
  isSandbox?: boolean;
  enabled?: boolean;
}

export interface PaymentGatewayConfig {
  billplz?: BillplzConfig;
}
