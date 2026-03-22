import { z } from "zod";

/**
 * Create User DTO
 * Trust Firebase token for identity, not client.
 */
export const CreateUserDTO = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  email: z.email().optional(),
  termsAccepted: z.literal(true),
});

/**
 * Update User DTO
 * Strictly controlled editable fields.
 */
export const UpdateUserDTO = z
  .object({
    first_name: z.string().trim().min(1).max(50).optional(),
    last_name: z.string().trim().min(1).max(50).optional(),
    display_name: z.string().trim().min(1).max(100).optional(),
    photo_url: z.string().url().optional(),
    profile_complete: z.boolean().optional(),
    terms_accepted: z.literal(true).optional(),
  })
  .strict();
