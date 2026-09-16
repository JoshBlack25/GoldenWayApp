/**
 * GoldenWay — legacy error shape.
 *
 * The app used to talk to the Spring Boot REST API over fetch(); it now
 * talks to Supabase (see src/lib/supabaseClient.js and src/api/goldenway.js).
 * RegisterScreen/LoginScreen still check `err instanceof ApiError`,
 * `err.status` and `err.fieldErrors`, so this shape is kept and every
 * Supabase/Postgres error gets wrapped into it (src/api/goldenway.js).
 */
export class ApiError extends Error {
  constructor(status, data) {
    super(
      (data && data.error) ||
        (data && typeof data === "object" && Object.keys(data).length
          ? Object.values(data).join("; ")
          : null) ||
        `Request failed (${status})`,
    );
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }

  /** Field-level validation errors, e.g. { email: "must be …" } */
  get fieldErrors() {
    if (!this.data || typeof this.data !== "object") return {};
    return Object.fromEntries(
      Object.entries(this.data).filter(
        ([key, value]) => key !== "error" && typeof value === "string",
      ),
    );
  }
}
