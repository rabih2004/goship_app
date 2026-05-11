import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // We don't throw here — server actions/webhooks throw at call time.
  // Importing this module during build with empty keys must not fail.
  console.warn("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

/**
 * Stripe Connect Express helpers.
 *
 * Flow:
 *   1. createConnectAccount() — once per forwarder → returns acct_xxx
 *   2. createAccountOnboardingLink(acct, returnUrl) → forwarder redirects to Stripe
 *   3. Forwarder completes Stripe-hosted onboarding (KYC, bank, etc.)
 *   4. Stripe POSTs `account.updated` to our webhook → we mark onboardingComplete
 */

export async function createConnectAccount(params: {
  email: string;
  countryCode: string;
  companyName: string;
}): Promise<Stripe.Account> {
  return stripe.accounts.create({
    type: "express",
    country: params.countryCode,
    email: params.email,
    business_type: "company",
    company: { name: params.companyName },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    settings: {
      payouts: { schedule: { interval: "manual" } },
    },
  });
}

export async function createAccountOnboardingLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });
}

/**
 * Returns true if the Stripe account has completed enough for us to gate
 * quotes/payouts on (charges + transfers + details submitted).
 */
export function isAccountReady(account: Stripe.Account): boolean {
  return Boolean(
    account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled
  );
}

export async function retrieveAccount(accountId: string): Promise<Stripe.Account> {
  return stripe.accounts.retrieve(accountId);
}

/** Verifies the Stripe-Signature header and returns the parsed event. */
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
