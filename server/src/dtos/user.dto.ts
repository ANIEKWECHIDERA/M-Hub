import { z } from "zod";

/**
 * Create User DTO
 * Trust Firebase token for identity, not client
 */
export const CreateUserDTO = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().optional(), // fallback only
  termsAccepted: z.literal(true),
});

/**
 * Update User DTO
 * Strictly controlled editable fields
 */
export const UpdateUserDTO = z
  .object({
    first_name: z.string().min(1).max(50).optional(),
    last_name: z.string().min(1).max(50).optional(),
    display_name: z.string().min(1).max(100).optional(),
    photo_url: z.string().url().optional(),
    profile_complete: z.boolean(),
  })
  .strict();
