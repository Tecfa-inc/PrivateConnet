import { z } from "zod";

const key32 = z
  .string()
  .min(1, "missing")
  .refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes, base64-encoded");

const schema = z
  .object({
    DATABASE_URL: z.string().url(),
    APP_ORIGIN: z.string().url(),
    ADMIN_ORIGIN: z.string().url(),
    FIELD_ENCRYPTION_KEY: key32,
    BLIND_INDEX_KEY: key32,
    MEDIA_SIGNING_KEY: key32,
    BETTER_AUTH_SECRET: z.string().min(32),
    MEDIA_ROOT: z.string().min(1),
    SUPPORT_PHONE: z.string().regex(/^\+\d{8,15}$/),
  })
  .refine((e) => e.FIELD_ENCRYPTION_KEY !== e.BLIND_INDEX_KEY, {
    message: "FIELD_ENCRYPTION_KEY and BLIND_INDEX_KEY must differ",
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated settings. Throws at first use if anything is missing, so a bad deploy fails fast. */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const problems = parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`);
      throw new Error(`Invalid environment:\n${problems.join("\n")}`);
    }
    cached = parsed.data;
  }
  return cached;
}
