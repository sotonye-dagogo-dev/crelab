import { PlatformConfigService } from "@/services/PlatformConfigService";
import {
  choosePaymentRuntime,
  paymentAdapters,
} from "@/lib/payments/runtime";
import type { PaymentProviderAdapter, PaymentRuntime } from "@/lib/payments/types";

/**
 * Server-side payment routing. The pure decision lives in
 * `lib/payments/runtime.ts`; this service is the only layer allowed to read
 * the persisted platform config (lib must never depend on services).
 */
export class PaymentProviderService {
  static async getRuntime(): Promise<{
    runtime: PaymentRuntime;
    adapter: PaymentProviderAdapter;
  }> {
    const config = await PlatformConfigService.get();
    const runtime = choosePaymentRuntime(config.payments?.provider);
    return { runtime, adapter: paymentAdapters[runtime.provider] };
  }
}
