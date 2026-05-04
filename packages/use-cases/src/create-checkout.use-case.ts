import { LemonSqueezyService, CheckoutResult } from '@omnireport/infrastructure';

export interface CreateCheckoutUseCaseDeps {
  lemonSqueezyService: LemonSqueezyService;
}

export interface CreateCheckoutInput {
  variantId: string;
  organizationId: string;
  organizationName: string;
}

export class CreateCheckoutUseCase {
  private lemonSqueezyService: LemonSqueezyService;

  constructor(deps: CreateCheckoutUseCaseDeps) {
    this.lemonSqueezyService = deps.lemonSqueezyService;
  }

  async execute(input: CreateCheckoutInput): Promise<CheckoutResult> {
    return this.lemonSqueezyService.createCheckout(
      input.variantId,
      input.organizationId,
      input.organizationName
    );
  }
}
