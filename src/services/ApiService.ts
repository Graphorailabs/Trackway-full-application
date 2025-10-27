export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: TBody;
  signal?: AbortSignal;
  timeoutMs?: number; // default 30s
}

export class ApiError extends Error {
  status: number;
  info?: unknown;
  constructor(message: string, status: number, info?: unknown) {
    super(message);
    this.status = status;
    this.info = info;
  }
}

export class ApiService {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
    if (!timeoutMs) return { signal };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const composite = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    // Pipe aborts to composite
    controller.signal.addEventListener("abort", () => composite.abort(), {
      once: true,
    });
    return { signal: composite.signal, cleanup: () => clearTimeout(timer) };
  }

  async request<T = unknown>(
    path: string,
    {
      method = "GET",
      headers,
      body,
      signal,
      timeoutMs = 30_000,
    }: RequestOptions,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const { signal: effectiveSignal, cleanup } = this.withTimeout(
      signal,
      timeoutMs,
    );

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body as BodyInit | null | undefined,
        signal: effectiveSignal,
        credentials: "omit",
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        let info: unknown = undefined;
        try {
          info = contentType.includes("application/json")
            ? await res.json()
            : await res.text();
        } catch {
          /* noop */
        }
        throw new ApiError(`Request failed: ${res.status}`, res.status, info);
      }

      // Smart return: JSON vs Blob vs text
      if (contentType.includes("application/json")) {
        return (await res.json()) as T;
      }
      if (
        contentType.includes("application/zip") ||
        contentType.includes("application/octet-stream")
      ) {
        return (await res.blob()) as unknown as T;
      }
      // Fallback to text
      return (await res.text()) as unknown as T;
    } finally {
      cleanup?.();
    }
  }

  postJson<TResp = unknown, TBody extends object = object>(
    path: string,
    body: TBody,
    // allow headers in opts; only omit method/body
    opts?: Omit<RequestOptions, "method" | "body">,
  ) {
    const { headers, ...rest } = opts ?? {};
    return this.request<TResp>(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", ...(headers ?? {}) },
      ...rest,
    });
  }

  postForm<TResp = unknown>(
    path: string,
    form: FormData,
    // allow headers in opts; only omit method/body
    opts?: Omit<RequestOptions, "method" | "body">,
  ) {
    const { headers, ...rest } = opts ?? {};
    // Don't set content-type; browser sets multipart boundary.
    return this.request<TResp>(path, {
      method: "POST",
      body: form,
      headers, // optional extra headers from caller
      ...rest,
    });
  }
}
