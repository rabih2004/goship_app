/**
 * Transactional email abstraction. Switch via EMAIL_PROVIDER env var.
 *
 * "mock"   — logs a formatted preview to the server console.
 * "resend" — sends via Resend.com (requires RESEND_API_KEY).
 *
 * Templates are plain-text + minimal HTML strings — no MJML / templating engine
 * yet. When the volume justifies it, swap the bodies for component-rendered HTML.
 */

export type EmailProvider = "mock" | "resend";

export function emailProvider(): EmailProvider {
  return (process.env.EMAIL_PROVIDER ?? "mock").toLowerCase() === "resend"
    ? "resend"
    : "mock";
}

export type SendInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(input: SendInput): Promise<void> {
  if (emailProvider() === "mock") {
    const sep = "─".repeat(60);
    console.log(
      `\n${sep}\n` +
        `📬 [mock email]\n` +
        `   To:      ${input.to}\n` +
        `   Subject: ${input.subject}\n` +
        `${sep}\n${input.text}\n${sep}\n`
    );
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "GoShip <onboarding@resend.dev>";
  const replyTo = process.env.EMAIL_REPLY_TO;
  if (!apiKey) {
    throw new Error("EMAIL_PROVIDER=resend requires RESEND_API_KEY");
  }

  // Lazy-import so we don't pull Resend SDK in mock mode.
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    ...(replyTo ? { replyTo } : {}),
  });
  if (error) {
    console.error("Resend send failed:", error);
    throw new Error(`Resend error: ${error.message}`);
  }
}

// ---------- Templates ----------

export function tplStageChanged(args: {
  bookingNumber: string;
  newStage: string;
  notes?: string;
  trackingUrl: string;
}): SendInput["text"] {
  return [
    `Your shipment ${args.bookingNumber} just moved to: ${args.newStage}`,
    "",
    args.notes ? `Note from forwarder: ${args.notes}` : null,
    args.notes ? "" : null,
    `Track it: ${args.trackingUrl}`,
  ]
    .filter((s) => s !== null)
    .join("\n");
}

export function tplDocumentUploaded(args: {
  bookingNumber: string;
  documentType: string;
  trackingUrl: string;
}): SendInput["text"] {
  return [
    `A new ${args.documentType} document was uploaded to your booking ${args.bookingNumber}.`,
    "",
    `View & download: ${args.trackingUrl}`,
  ].join("\n");
}

export function tplBookingConfirmedToForwarder(args: {
  bookingNumber: string;
  customerName: string;
  totalUSD: string;
  payoutUSD: string;
  bookingUrl: string;
}): SendInput["text"] {
  return [
    `${args.customerName} just booked your quote.`,
    "",
    `  Booking #: ${args.bookingNumber}`,
    `  Total:     ${args.totalUSD}`,
    `  Payout:    ${args.payoutUSD}`,
    "",
    `Open it: ${args.bookingUrl}`,
  ].join("\n");
}
