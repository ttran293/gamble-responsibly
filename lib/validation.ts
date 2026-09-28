import { z } from "zod";
import { demoInvitationSenderEmail } from "./invitation-email";

export const invitationSchema = z.object({
  senderName: z.string().trim().min(2).max(80),
  senderEmail: z.literal(demoInvitationSenderEmail),
  recipientEmail: z.string().trim().email().max(254),
  note: z.string().trim().max(500).optional()
});
