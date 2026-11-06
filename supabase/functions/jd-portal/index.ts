import { adminPage } from "./admin-page.ts";

const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const appOrigin = (Deno.env.get("APP_ORIGIN") ?? "").replace(/\/+$/, "");
const functionOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const cookiePath = "/functions/v1/jd-portal";
const imageBucket = "jd-site-images";
const inbox = "johnsonokemwa7@gmail.com";
const allowedCategories = new Set(["Homepage", "Portfolio", "Industries", "Services", "Team", "Gallery", "Promotional"]);
const allowedImageTypes = new Map([
  ["image/jpeg", { extension: "jpg", signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff }],
  ["image/png", { extension: "png", signature: (bytes: Uint8Array) => bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a }],
  ["image/webp", { extension: "webp", signature: (bytes: Uint8Array) => bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP" }],
  ["image/avif", { extension: "avif", signature: (bytes: Uint8Array) => bytes.length >= 12 && new TextDecoder().decode(bytes.slice(4, 12)).includes("ftyp") && /avif|avis/.test(new TextDecoder().decode(bytes.slice(8, 16))) }],
]);

interface PortalImage {
  image_key: string;
  category: string;
  title: string;
  alt_text: string;
  section_name: string;
  storage_path: string | null;
  fallback_url: string | null;
  is_published: boolean;
  updated_at: string;
}

interface AdminSession {
  email: string;
  setCookies: string[];
}

function jsonResponse(data: unknown, status = 200, headers?: Headers): Response {
  const responseHeaders = headers ?? new Headers();
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function responseHeaders(request: Request, cookies: string[] = []): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Vary": "Origin"
  });
  const origin = request.headers.get("Origin");
  if (origin && (origin === appOrigin || origin === functionOrigin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "600");
  }
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return headers;
}

function configured(): boolean {
  return Boolean(
    supabaseUrl &&
    anonKey &&
    serviceRoleKey &&
    appOrigin &&
    Deno.env.get("RESEND_API_KEY") &&
    Deno.env.get("EMAIL_FROM") &&
    Deno.env.get("TURNSTILE_SECRET_KEY") &&
    Deno.env.get("RATE_LIMIT_SECRET") &&
    Deno.env.get("ADMIN_EMAILS")
  );
}

function isAllowedAdmin(email: string): boolean {
  const admins = (Deno.env.get("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (declaredLength > maxBytes) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) return null;
  try {
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stringField(body: Record<string, unknown>, key: string, maxLength: number): string | null {
  const value = body[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(trimmed)) return null;
  return trimmed;
}

function cookieMap(request: Request): Map<string, string> {
  const values = new Map<string, string>();
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      values.set(key, decodeURIComponent(value));
    } catch {
      continue;
    }
  }
  return values;
}

function sessionCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=${cookiePath}; Secure; HttpOnly; SameSite=Strict`;
}

function clearSessionCookies(): string[] {
  return [
    sessionCookie("jd_admin_access", "", 0),
    sessionCookie("jd_admin_refresh", "", 0)
  ];
}

async function authUser(accessToken: string): Promise<{ email: string } | null> {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { "apikey": anonKey, "Authorization": `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) return null;
  const user: unknown = await response.json();
  if (!user || typeof user !== "object" || !("email" in user) || typeof user.email !== "string") return null;
  return { email: user.email };
}

async function refreshSession(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "apikey": anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) return null;
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("access_token" in result) || !("refresh_token" in result)) return null;
  if (typeof result.access_token !== "string" || typeof result.refresh_token !== "string") return null;
  const expires = "expires_in" in result && typeof result.expires_in === "number" ? result.expires_in : 3600;
  return { access_token: result.access_token, refresh_token: result.refresh_token, expires_in: expires };
}

async function requireAdmin(request: Request): Promise<AdminSession | null> {
  const cookies = cookieMap(request);
  const accessToken = cookies.get("jd_admin_access");
  if (accessToken) {
    const user = await authUser(accessToken);
    if (user && isAllowedAdmin(user.email)) return { email: user.email, setCookies: [] };
  }
  const refreshToken = cookies.get("jd_admin_refresh");
  if (!refreshToken) return null;
  const refreshed = await refreshSession(refreshToken);
  if (!refreshed) return null;
  const user = await authUser(refreshed.access_token);
  if (!user || !isAllowedAdmin(user.email)) return null;
  return {
    email: user.email,
    setCookies: [
      sessionCookie("jd_admin_access", refreshed.access_token, Math.min(refreshed.expires_in, 3600)),
      sessionCookie("jd_admin_refresh", refreshed.refresh_token, 60 * 60 * 24 * 30)
    ]
  };
}

function validAdminOrigin(request: Request): boolean {
  return request.headers.get("Origin") === functionOrigin;
}

async function serviceRequest(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers
    },
    signal: AbortSignal.timeout(15000)
  });
}

async function removeStorageObject(storagePath: string): Promise<void> {
  const response = await serviceRequest(`/storage/v1/object/${imageBucket}`, {
    method: "DELETE",
    body: JSON.stringify({ prefixes: [storagePath] })
  });
  if (!response.ok) throw new Error(`Storage cleanup failed (${response.status}).`);
}

function publicImageUrl(storagePath: string): string {
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${imageBucket}/${encodedPath}`;
}

function imageUrl(image: PortalImage): string {
  if (image.storage_path) return publicImageUrl(image.storage_path);
  if (image.fallback_url?.startsWith("/")) return `${appOrigin}${image.fallback_url}`;
  return image.fallback_url ?? "";
}

async function listImages(publishedOnly: boolean): Promise<PortalImage[]> {
  const filter = publishedOnly ? "&is_published=eq.true" : "";
  const response = await serviceRequest(
    `/rest/v1/jd_site_images?select=image_key,category,title,alt_text,section_name,storage_path,fallback_url,is_published,updated_at&order=category.asc,title.asc${filter}`
  );
  if (!response.ok) throw new Error(`Image library lookup failed (${response.status}).`);
  const images: unknown = await response.json();
  if (!Array.isArray(images)) throw new Error("Image library returned an invalid response.");
  return images as PortalImage[];
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = request.headers.get("cf-connecting-ip")?.trim() || forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return address.slice(0, 80);
}

async function consumeRateLimit(request: Request, subject: string, limit: number, windowSeconds: number): Promise<boolean> {
  const secret = Deno.env.get("RATE_LIMIT_SECRET");
  if (!secret) throw new Error("Rate limiting is not configured.");
  const value = new TextEncoder().encode(`${secret}:${clientIp(request)}:${subject.toLowerCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", value);
  const bucketKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const response = await serviceRequest("/rest/v1/rpc/jd_consume_contact_limit", {
    method: "POST",
    body: JSON.stringify({ p_bucket_key: bucketKey, p_limit: limit, p_window_seconds: windowSeconds })
  });
  if (!response.ok) throw new Error(`Rate limit check failed (${response.status}).`);
  return await response.json() === true;
}

async function verifyTurnstile(token: string, request: Request): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) throw new Error("CAPTCHA verification is not configured.");
  const params = new URLSearchParams({ secret, response: token });
  const ip = clientIp(request);
  if (ip !== "unknown") params.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`CAPTCHA verification failed (${response.status}).`);
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("success" in result)) return false;
  if (result.success !== true) return false;
  const hostname = "hostname" in result && typeof result.hostname === "string" ? result.hostname.toLowerCase() : "";
  return hostname === new URL(appOrigin).hostname.toLowerCase();
}

async function sendContactEmail(body: Record<string, unknown>, request: Request): Promise<Response> {
  const allowedFields = new Set(["name", "email", "business", "phone", "service", "budget", "message", "privacyConsent", "website", "turnstileToken"]);
  if (Object.keys(body).some((key) => !allowedFields.has(key))) {
    return jsonResponse({ error: "Unexpected form fields were received." }, 400, responseHeaders(request));
  }
  const honeypot = stringField(body, "website", 200);
  if (honeypot === null) return jsonResponse({ error: "Invalid form submission." }, 400, responseHeaders(request));
  if (honeypot.length > 0) return jsonResponse({ error: "Invalid form submission." }, 400, responseHeaders(request));

  const name = stringField(body, "name", 100);
  const email = stringField(body, "email", 254);
  const business = stringField(body, "business", 120);
  const phone = stringField(body, "phone", 40);
  const service = stringField(body, "service", 120);
  const budget = stringField(body, "budget", 80);
  const message = stringField(body, "message", 4000);
  const turnstileToken = stringField(body, "turnstileToken", 2048);
  const consent = body.privacyConsent === true;

  if (!name || name.length < 2 || !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]{1,99}$/u.test(name)) {
    return jsonResponse({ error: "Enter a valid name between 2 and 100 characters." }, 400, responseHeaders(request));
  }
  if (!email || email.length < 5 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email) || /[\r\n]/.test(email)) {
    return jsonResponse({ error: "Enter a valid email address." }, 400, responseHeaders(request));
  }
  if (business === null || phone === null || !service || service.length < 2 || !message || message.length < 20 || !consent) {
    return jsonResponse({ error: "Complete the required fields, provide a message of at least 20 characters, and accept the privacy notice." }, 400, responseHeaders(request));
  }
  if (!turnstileToken) return jsonResponse({ error: "Complete the CAPTCHA check and try again." }, 400, responseHeaders(request));

  const [emailAllowed, sourceAllowed] = await Promise.all([
    consumeRateLimit(request, `contact-email:${email}`, 3, 600),
    consumeRateLimit(request, `contact-source:${clientIp(request)}`, 12, 600)
  ]);
  if (!emailAllowed || !sourceAllowed) {
    return jsonResponse({ error: "Too many enquiries were sent from this source. Please wait a few minutes and try again." }, 429, responseHeaders(request));
  }
  if (!(await verifyTurnstile(turnstileToken, request))) {
    return jsonResponse({ error: "CAPTCHA verification was not successful. Please try again." }, 400, responseHeaders(request));
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!apiKey || !from) throw new Error("Email delivery is not configured.");
  const submittedAt = new Date().toISOString();
  const text = [
    "New JOHNSON DIGITAL website enquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Business: ${business || "Not provided"}`,
    `Phone: ${phone || "Not provided"}`,
    `Service: ${service}`,
    `Budget: ${budget || "Not provided"}`,
    `Submitted: ${submittedAt}`,
    "",
    "Message:",
    message
  ].join("\n");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [inbox],
      reply_to: email,
      subject: `New website enquiry — ${service.replace(/[\r\n]/g, " ")}`,
      text
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    const responseText = await response.text();
    console.error("Resend rejected an enquiry.", response.status, responseText.slice(0, 1000));
    return jsonResponse({ error: "Your enquiry could not be delivered right now. Please try again later or contact us directly." }, 502, responseHeaders(request));
  }
  return jsonResponse({ success: true }, 200, responseHeaders(request));
}

async function login(request: Request): Promise<Response> {
  const headers = responseHeaders(request);
  const body = await readJson(request, 4096);
  if (!body) return jsonResponse({ error: "Invalid sign-in request." }, 400, headers);
  const email = stringField(body, "email", 254);
  const password = typeof body.password === "string" && body.password.length <= 256 ? body.password : "";
  if (!email || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email) || !password) {
    return jsonResponse({ error: "Enter a valid administrator email and password." }, 400, headers);
  }
  const [emailAllowed, sourceAllowed] = await Promise.all([
    consumeRateLimit(request, `admin-email:${email}`, 8, 900),
    consumeRateLimit(request, `admin-source:${clientIp(request)}`, 20, 900)
  ]);
  if (!emailAllowed || !sourceAllowed) {
    return jsonResponse({ error: "Too many sign-in attempts. Wait a few minutes before trying again." }, 429, headers);
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) return jsonResponse({ error: "Sign-in failed. Check your account and try again." }, 401, headers);
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("access_token" in result) || !("refresh_token" in result) || !("user" in result)) {
    return jsonResponse({ error: "Sign-in returned an invalid response." }, 502, headers);
  }
  const user = result.user as { email?: unknown };
  if (typeof user.email !== "string" || !isAllowedAdmin(user.email)) {
    return jsonResponse({ error: "This account is not authorized to manage website media." }, 403, headers);
  }
  const expiresIn = "expires_in" in result && typeof result.expires_in === "number" ? result.expires_in : 3600;
  headers.append("Set-Cookie", sessionCookie("jd_admin_access", String(result.access_token), Math.min(expiresIn, 3600)));
  headers.append("Set-Cookie", sessionCookie("jd_admin_refresh", String(result.refresh_token), 60 * 60 * 24 * 30));
  return jsonResponse({ success: true, email: user.email }, 200, headers);
}

async function uploadImage(request: Request): Promise<Response> {
  const lengthHeader = request.headers.get("Content-Length");
  const length = Number(lengthHeader);
  if (!lengthHeader || !Number.isFinite(length) || length < 1 || length > 10 * 1024 * 1024) {
    return jsonResponse({ error: "Upload request is too large or missing a valid content length." }, 413);
  }
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || file.size < 1 || file.size > 8 * 1024 * 1024) {
    return jsonResponse({ error: "Choose an image no larger than 8 MB." }, 400);
  }
  const typeInfo = allowedImageTypes.get(file.type);
  if (!typeInfo) return jsonResponse({ error: "Only JPEG, PNG, WebP and AVIF images are allowed." }, 415);
  const imageKey = String(form.get("image_key") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const altText = String(form.get("alt_text") ?? "").trim();
  const sectionName = String(form.get("section_name") ?? "").trim();
  const publishedValue = String(form.get("is_published") ?? "false");
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(imageKey) || !allowedCategories.has(category) ||
      title.length < 1 || title.length > 120 || altText.length < 1 || altText.length > 240 ||
      sectionName.length < 1 || sectionName.length > 120 || !["true", "false"].includes(publishedValue)) {
    return jsonResponse({ error: "Check the image key, category, title, section and alternative text." }, 400);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!typeInfo.signature(bytes)) return jsonResponse({ error: "The image contents do not match the selected file type." }, 415);

  const oldResponse = await serviceRequest(
    `/rest/v1/jd_site_images?select=storage_path&image_key=eq.${encodeURIComponent(imageKey)}`
  );
  if (!oldResponse.ok) throw new Error(`Image record lookup failed (${oldResponse.status}).`);
  const previous = await oldResponse.json() as Array<{ storage_path: string | null }>;
  const storagePath = `${imageKey}/${crypto.randomUUID()}.${typeInfo.extension}`;
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  const uploadResponse = await serviceRequest(`/storage/v1/object/${imageBucket}/${encodedPath}`, {
    method: "POST",
    headers: { "Content-Type": file.type, "x-upsert": "false" },
    body: bytes
  });
  if (!uploadResponse.ok) {
    console.error("Supabase Storage rejected an image upload.", uploadResponse.status, (await uploadResponse.text()).slice(0, 1000));
    return jsonResponse({ error: "The image could not be stored. Check storage configuration and try again." }, 502);
  }

  const recordResponse = await serviceRequest("/rest/v1/jd_site_images?on_conflict=image_key", {
    method: "POST",
    headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      image_key: imageKey,
      category,
      title,
      alt_text: altText,
      section_name: sectionName,
      storage_path: storagePath,
      is_published: publishedValue === "true",
      updated_at: new Date().toISOString()
    })
  });
  if (!recordResponse.ok) {
    try {
      await removeStorageObject(storagePath);
    } catch (cleanupError) {
      console.error("Could not clean up an unindexed image upload.", cleanupError);
    }
    console.error("Supabase rejected image metadata.", recordResponse.status, (await recordResponse.text()).slice(0, 1000));
    return jsonResponse({ error: "The image was uploaded, but its website record could not be saved." }, 502);
  }
  let cleanupWarning = false;
  const oldPath = previous[0]?.storage_path;
  if (oldPath && oldPath !== storagePath) {
    try {
      await removeStorageObject(oldPath);
    } catch (cleanupError) {
      cleanupWarning = true;
      console.error("A replaced image could not be removed from storage.", cleanupError);
    }
  }
  return jsonResponse({ success: true, cleanupWarning });
}

async function updateImage(request: Request): Promise<Response> {
  const body = await readJson(request, 4096);
  if (!body) return jsonResponse({ error: "Invalid image update request." }, 400);
  const imageKey = stringField(body, "image_key", 80);
  const title = stringField(body, "title", 120);
  const altText = stringField(body, "alt_text", 240);
  const sectionName = stringField(body, "section_name", 120);
  const category = stringField(body, "category", 40);
  if (!imageKey || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(imageKey) || !title || !altText || !sectionName ||
      !category || !allowedCategories.has(category) || typeof body.is_published !== "boolean") {
    return jsonResponse({ error: "Check the image key, category, title, section and alternative text." }, 400);
  }
  const response = await serviceRequest(`/rest/v1/jd_site_images?image_key=eq.${encodeURIComponent(imageKey)}`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: JSON.stringify({
      title,
      alt_text: altText,
      section_name: sectionName,
      category,
      is_published: body.is_published,
      updated_at: new Date().toISOString()
    })
  });
  if (!response.ok) throw new Error(`Image metadata update failed (${response.status}).`);
  return jsonResponse({ success: true });
}

async function deleteImage(request: Request): Promise<Response> {
  const body = await readJson(request, 2048);
  const imageKey = body ? stringField(body, "image_key", 80) : null;
  if (!imageKey || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(imageKey)) return jsonResponse({ error: "Invalid image key." }, 400);
  const lookup = await serviceRequest(`/rest/v1/jd_site_images?select=storage_path&image_key=eq.${encodeURIComponent(imageKey)}`);
  if (!lookup.ok) throw new Error(`Image lookup failed (${lookup.status}).`);
  const rows = await lookup.json() as Array<{ storage_path: string | null }>;
  if (!rows.length) return jsonResponse({ error: "Image not found." }, 404);
  const deletion = await serviceRequest(`/rest/v1/jd_site_images?image_key=eq.${encodeURIComponent(imageKey)}`, {
    method: "DELETE",
    headers: { "Prefer": "return=minimal" }
  });
  if (!deletion.ok) throw new Error(`Image record deletion failed (${deletion.status}).`);
  if (rows[0].storage_path) {
    try {
      await removeStorageObject(rows[0].storage_path);
    } catch (error) {
      console.error("Image metadata was deleted, but its storage object remains.", error);
      return jsonResponse({ success: true, cleanupWarning: true });
    }
  }
  return jsonResponse({ success: true });
}

function adminPageResponse(request: Request, cookies: string[] = []): Response {
  const headers = responseHeaders(request, cookies);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Content-Security-Policy", `default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' ${supabaseUrl}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(adminPage, { headers });
}

Deno.serve(async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "";
  const headers = responseHeaders(request);

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (!configured()) return jsonResponse({ error: "The website service is not configured yet." }, 503, headers);

  try {
    if (request.method === "GET" && url.searchParams.get("page") === "admin") {
      return adminPageResponse(request);
    }

    if (action === "contact" && request.method === "POST") {
      if (request.headers.get("Origin") !== appOrigin) return jsonResponse({ error: "Origin is not allowed." }, 403, headers);
      const body = await readJson(request, 12 * 1024);
      if (!body) return jsonResponse({ error: "Invalid enquiry request." }, 400, headers);
      return await sendContactEmail(body, request);
    }

    if (action === "images" && request.method === "GET") {
      const images = await listImages(true);
      return jsonResponse({
        images: images.map((image) => ({
          image_key: image.image_key,
          title: image.title,
          alt_text: image.alt_text,
          public_url: imageUrl(image)
        }))
      }, 200, headers);
    }

    if (action === "login" && request.method === "POST") {
      if (!validAdminOrigin(request)) return jsonResponse({ error: "Origin is not allowed." }, 403, headers);
      return await login(request);
    }
    if (action === "logout" && request.method === "POST") {
      if (!validAdminOrigin(request)) return jsonResponse({ error: "Origin is not allowed." }, 403, headers);
      return jsonResponse({ success: true }, 200, responseHeaders(request, clearSessionCookies()));
    }
    if (action === "admin-session" && request.method === "GET") {
      if (!validAdminOrigin(request)) return jsonResponse({ error: "Origin is not allowed." }, 403, headers);
      const session = await requireAdmin(request);
      if (!session) return jsonResponse({ error: "Sign in to manage website images." }, 401, headers);
      return jsonResponse({ email: session.email }, 200, responseHeaders(request, session.setCookies));
    }
    if (action === "admin-images" && request.method === "GET") {
      if (!validAdminOrigin(request)) return jsonResponse({ error: "Origin is not allowed." }, 403, headers);
      const session = await requireAdmin(request);
      if (!session) return jsonResponse({ error: "Sign in to manage website images." }, 401, responseHeaders(request, clearSessionCookies()));
      const images = await listImages(false);
      return jsonResponse({
        images: images.map((image) => ({ ...image, public_url: imageUrl(image) }))
      }, 200, responseHeaders(request, session.setCookies));
    }

    if (["image-upload", "image-update", "image-delete"].includes(action) && request.method === "POST") {
      if (!validAdminOrigin(request)) return jsonResponse({ error: "Origin is not allowed." }, 403, headers);
      const session = await requireAdmin(request);
      if (!session) return jsonResponse({ error: "Sign in to manage website images." }, 401, responseHeaders(request, clearSessionCookies()));
      let response: Response;
      if (action === "image-upload") response = await uploadImage(request);
      else if (action === "image-update") response = await updateImage(request);
      else response = await deleteImage(request);
      for (const cookie of session.setCookies) response.headers.append("Set-Cookie", cookie);
      return response;
    }

    return jsonResponse({ error: "Endpoint not found." }, 404, headers);
  } catch (error) {
    console.error("JOHNSON DIGITAL portal request failed.", error);
    return jsonResponse({ error: "The request could not be completed. Please try again later." }, 500, headers);
  }
});
