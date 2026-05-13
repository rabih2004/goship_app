import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(160);
export const passwordSchema = z.string().min(8).max(100);
export const nameSchema = z.string().trim().min(1).max(120);
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Use a 2-letter ISO country code (e.g. LB, DE, US)");

export const signInInput = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const baseSignUpInput = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  locale: z.enum(["en", "ar"]).default("en"),
});

export const customerSignUpInput = baseSignUpInput.extend({
  role: z.literal("CUSTOMER"),
});

export const forwarderSignUpInput = baseSignUpInput.extend({
  role: z.literal("FORWARDER"),
  companyName: z.string().trim().min(1).max(120),
  countryCode: countryCodeSchema,
});

export const coworkerSignUpInput = baseSignUpInput.extend({
  role: z.literal("COWORKER"),
  displayName: z.string().trim().min(1).max(120),
  countryCode: countryCodeSchema,
  cityArea: z.string().trim().min(1).max(120),
});

export const customsAgentSignUpInput = baseSignUpInput.extend({
  role: z.literal("CUSTOMS_AGENT"),
  displayName: z.string().trim().min(1).max(120),
  countryCode: countryCodeSchema,
  licenseNumber: z.string().trim().max(80).optional(),
});

export const signUpInput = z.discriminatedUnion("role", [
  customerSignUpInput,
  forwarderSignUpInput,
  coworkerSignUpInput,
  customsAgentSignUpInput,
]);

export type SignUpInput = z.infer<typeof signUpInput>;
