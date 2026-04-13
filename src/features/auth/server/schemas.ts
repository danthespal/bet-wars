import { z } from "zod";

const emailSchema = z
  .email()
  .transform((value) => value.trim().toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

export const RegisterSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const LoginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required."),
  })
  .strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
