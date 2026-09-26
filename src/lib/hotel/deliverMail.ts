export type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type MailDelivery = {
  delivered: boolean;
  channel: "caixa" | "resend";
};

export async function deliverMail(payload: MailPayload): Promise<MailDelivery> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.VOUCHER_FROM_EMAIL?.trim() || "Hotel Aurora <noreply@hotelaurora.com>";
  if (!key) {
    return { delivered: false, channel: "caixa" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });
    if (!res.ok) {
      return { delivered: false, channel: "caixa" };
    }
    return { delivered: true, channel: "resend" };
  } catch {
    return { delivered: false, channel: "caixa" };
  }
}
