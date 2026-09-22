import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx"
import { writeFileSync } from "node:fs"

const BRAND = "2563EB"
const CODE_BG = "F3F4F6"
const HEADER_BG = "1E3A8A"

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, color: "111827", size: 30 })],
  })
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, color: BRAND, size: 26 })],
  })
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, color: "111827", size: 23 })],
  })
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    children: [new TextRun({ text, size: 22, color: "1F2937", ...opts })],
  })
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60, line: 264 },
    children: [new TextRun({ text, size: 22, color: "1F2937" })],
  })
}

function labelValue(label, value) {
  return new Paragraph({
    spacing: { after: 60, line: 264 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22, color: "111827" }),
      new TextRun({ text: value, size: 22, color: "1F2937" }),
    ],
  })
}

function code(snippet) {
  const lines = snippet.split("\n")
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    shading: { type: ShadingType.CLEAR, fill: CODE_BG, color: "auto" },
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB", space: 6 },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB", space: 6 },
      left: { style: BorderStyle.SINGLE, size: 18, color: BRAND, space: 8 },
      right: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB", space: 6 },
    },
    children: lines.flatMap((line, i) => {
      const runs = [
        new TextRun({ text: line || " ", font: "Consolas", size: 18, color: "374151" }),
      ]
      if (i < lines.length - 1) runs.push(new TextRun({ break: 1 }))
      return runs
    }),
  })
}

function cell(text, { bold = false, color = "1F2937", fill, width } = {}) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: fill ? { type: ShadingType.CLEAR, fill, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20, color })],
      }),
    ],
  })
}

function summaryTable() {
  const rows = [
    ["#", "Finding", "Severity", "Status"],
    ["1", "Investor could self-escalate to admin via profiles.role", "Critical", "Fixed"],
    ["2", "Premium property data exposed via public REST", "High", "Fixed"],
    ["3", "/api/notify open email relay", "High", "Fixed"],
    ["4", "Investors could rewrite / forge their own inquiry threads", "Medium", "Fixed"],
    ["5", "typescript.ignoreBuildErrors: true", "Medium", "Fixed"],
    ["6", "No security response headers", "Medium", "Fixed"],
    ["7", "Public increment_property_views", "Low", "Reviewed"],
  ]
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
    },
    rows: rows.map((r, i) => {
      const isHeader = i === 0
      return new TableRow({
        tableHeader: isHeader,
        children: [
          cell(r[0], { bold: isHeader, color: isHeader ? "FFFFFF" : "1F2937", fill: isHeader ? HEADER_BG : undefined, width: 6 }),
          cell(r[1], { bold: isHeader, color: isHeader ? "FFFFFF" : "1F2937", fill: isHeader ? HEADER_BG : undefined, width: 62 }),
          cell(r[2], { bold: isHeader, color: isHeader ? "FFFFFF" : "1F2937", fill: isHeader ? HEADER_BG : undefined, width: 16 }),
          cell(r[3], { bold: isHeader, color: isHeader ? "FFFFFF" : "1F2937", fill: isHeader ? HEADER_BG : undefined, width: 16 }),
        ],
      })
    }),
  })
}

const children = []

// Title block
children.push(
  new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: "Amazon Homes Investor Portal", bold: true, size: 24, color: BRAND })],
  }),
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: "Security Implementation Documentation", bold: true, size: 44, color: "111827" })],
  }),
  new Paragraph({
    spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BRAND, space: 8 } },
    children: [
      new TextRun({ text: "Prepared by v0  |  Last updated: September 17, 2026", size: 20, color: "6B7280" }),
    ],
  }),
)

// Overview
children.push(
  h1("1. Overview"),
  body(
    "This document describes the security controls implemented for the Amazon Homes Investor Portal following a full security audit. Seven findings were identified and remediated across the database (Supabase / PostgreSQL Row Level Security, triggers, and functions) and the Next.js application layer.",
  ),
  body(
    "Each control is documented below with its purpose, the exact database function or configuration used, and how it was verified. All database fixes were tested against the live database by simulating the real attacker session inside rolled-back transactions, so no production data was altered during verification.",
  ),
  h2("Remediation Summary"),
  summaryTable(),
  new Paragraph({ spacing: { after: 120 }, children: [] }),
)

// Step 1
children.push(
  h1("2. Privilege Escalation Prevention (Critical)"),
  labelValue("Finding", "Any signed-in investor could update their own profiles row and set role = 'admin', gaining full admin access to every table and the /admin dashboard."),
  labelValue("Layer", "Database — BEFORE UPDATE trigger on public.profiles"),
  labelValue("Root cause", "The profiles_update_own RLS policy allowed row updates with no column restriction, and is_admin() derives admin status purely from profiles.role."),
  h3("Function: public.prevent_role_change()"),
  body("If a row's role is being changed, the change is allowed only for the service role (auth.uid() is null) or an existing admin. For anyone else the role is silently reverted to its previous value, while all other profile edits (name, phone, company) proceed normally."),
  code(
`create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is null or public.is_admin() then
      return new;
    end if;
    -- Non-admin attempting to change their own role: keep the old value.
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_change on public.profiles;
create trigger prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();`,
  ),
  labelValue("Verification", "Simulated the investor session and attempted to set role = 'admin' and change name in one update. Result: role stayed 'investor' (blocked), name updated (allowed). Transaction rolled back."),
)

// Step 2
children.push(
  h1("3. Premium Property Data Protection (High)"),
  labelValue("Finding", "The properties table was world-readable (SELECT USING true). Premium fields (ARV, estimated rehab, showing info, protected interior photos) were only hidden client-side, so they were retrievable directly via the public REST endpoint."),
  labelValue("Layer", "Database — private table with RLS + server-side merge in the app"),
  h3("Private table: public.property_private"),
  body("Premium fields were moved into a dedicated private table. Any signed-in user may read it; only admins may write it. The public properties table was redacted (financials zeroed, showing info cleared, protected photo URLs stripped) while keeping placeholder slots so the UI still renders locked slots in order."),
  code(
`create table if not exists public.property_private (
  id text primary key references public.properties(id) on delete cascade,
  arv numeric not null default 0,
  estimated_rehab numeric not null default 0,
  showing_info text not null default '',
  photos jsonb not null default '[]'::jsonb
);

alter table public.property_private enable row level security;

-- Any signed-in user may read premium data; only admins may write it.
create policy "property_private_select_authed" on public.property_private
  for select to authenticated using (true);

create policy "property_private_admin_all" on public.property_private
  for all to authenticated using (public.is_admin()) with check (public.is_admin());`,
  ),
  h3("Application changes (lib/store.tsx)"),
  bullet("saveProperty writes redacted data to properties and the real premium data to property_private."),
  bullet("loadScopedData fetches both tables and merges the private premium fields back in — only for signed-in users."),
  labelValue("Verification", "Simulated the anonymous (anon key) session: every property returned arv 0, estimated_rehab 0, empty showing_info, and 0 leaked protected photo URLs. Signed-in users see the real values."),
)

// Step 3
children.push(
  h1("4. Notification Endpoint Hardening (High)"),
  labelValue("Finding", "/api/notify accepted a caller-supplied recipient (to) and forwarded it to Resend with no authentication or rate limiting — an open email relay usable for spam/phishing from the verified domain."),
  labelValue("Layer", "Application — app/api/notify/route.ts + call sites in lib/store.tsx"),
  h3("Controls implemented"),
  bullet("The server never trusts a client-supplied recipient. Lead notifications always go to the server-side team inbox (LEAD_NOTIFICATION_EMAIL)."),
  bullet("Reply notifications require an authenticated Supabase session and the recipient is derived from the DB inquiry record: admin-to-investor uses the inquiry owner's email; investor-to-admin uses the team address."),
  bullet("Reply requests are authorized — the caller must be an admin or the inquiry's owner."),
  bullet("Best-effort in-memory rate limiting by IP, plus payload size caps."),
  labelValue("Verification", "Unauthenticated reply attempts are rejected; the old arbitrary-recipient attack no longer works; a burst of requests triggers the rate limiter (HTTP 429)."),
  labelValue("Operational note", "Email delivery requires RESEND_API_KEY (and LEAD_NOTIFICATION_EMAIL) to be set. The endpoint is now safe to expose once those are configured."),
)

// Step 4
children.push(
  h1("5. Inquiry Record Integrity (Medium)"),
  labelValue("Finding", "The 'own inquiries update' RLS policy let investors update any column on their own inquiries — status, message, property_id, and the entire replies JSONB — enabling them to forge an official 'admin' reply or flip status values."),
  labelValue("Layer", "Database — BEFORE UPDATE trigger on public.inquiries"),
  h3("Function: public.restrict_investor_inquiry_update()"),
  body("For non-admin callers, immutable columns are locked to their previous values, status may only be set to 'new', existing replies cannot be modified or removed, and any appended reply must carry authorRole = 'investor' (blocking forged admin replies). Service role and admins bypass the restriction."),
  code(
`create or replace function public.restrict_investor_inquiry_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_len int;
  new_len int;
  i int;
  appended jsonb;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- Lock immutable columns to their previous values.
  new.id := old.id;
  new.property_id := old.property_id;
  new.name := old.name;
  new.company := old.company;
  new.email := old.email;
  new.phone := old.phone;
  new.message := old.message;
  new.created_at := old.created_at;

  -- Status may only be set to 'new' (or left unchanged).
  if new.status is distinct from old.status and new.status <> 'new' then
    new.status := old.status;
  end if;

  -- Replies: existing entries are immutable; only investor replies may append.
  old_len := coalesce(jsonb_array_length(old.replies), 0);
  new_len := coalesce(jsonb_array_length(new.replies), 0);

  if new_len < old_len then
    raise exception 'Cannot remove or modify existing replies';
  end if;

  for i in 0 .. old_len - 1 loop
    if (new.replies -> i) is distinct from (old.replies -> i) then
      raise exception 'Cannot modify existing replies';
    end if;
  end loop;

  for i in old_len .. new_len - 1 loop
    appended := new.replies -> i;
    if coalesce(appended ->> 'authorRole', '') <> 'investor' then
      raise exception 'Appended replies must have authorRole = investor';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists restrict_investor_inquiry_update on public.inquiries;
create trigger restrict_investor_inquiry_update
  before update on public.inquiries
  for each row execute function public.restrict_investor_inquiry_update();`,
  ),
  labelValue("Verification", "Simulated the investor session: legitimate reply + status 'new' succeeded; forging an admin reply and editing an existing reply raised exceptions; rewriting email/message was reverted. Transaction rolled back."),
)

// Step 5
children.push(
  h1("6. Build-Time Type Safety (Medium)"),
  labelValue("Finding", "next.config.mjs set typescript.ignoreBuildErrors: true, allowing broken or unsafe changes to deploy despite failing type checks."),
  labelValue("Layer", "Application — next.config.mjs + source fixes"),
  body("The suppression was removed, which surfaced 8 real type errors. All 8 were fixed (including a missing InquiryReply import introduced during the notify/inquiry work), and the type check now passes cleanly. Type errors now block the build as intended."),
)

// Step 6
children.push(
  h1("7. Security Response Headers (Medium)"),
  labelValue("Finding", "No security response headers were configured."),
  labelValue("Layer", "Application — headers() in next.config.mjs"),
  body("Because the app has authenticated dashboards, frame-blocking and Permissions-Policy headers were added alongside the universally-safe headers:"),
  bullet("Strict-Transport-Security (HSTS)"),
  bullet("X-Content-Type-Options: nosniff"),
  bullet("Referrer-Policy: strict-origin-when-cross-origin"),
  bullet("X-Frame-Options: SAMEORIGIN (clickjacking protection)"),
  bullet("Permissions-Policy (disables unused camera, microphone, geolocation)"),
  labelValue("Verification", "All five headers confirmed served by the running app. Note: the v0 chat preview strips framing/CSP headers, but they apply on the deployed site."),
)

// Step 7
children.push(
  h1("8. Property View Counter Review (Low)"),
  labelValue("Finding", "public.increment_property_views(pid) is SECURITY DEFINER and callable by anyone."),
  labelValue("Assessment", "Acceptable as-is — no change required."),
  body("The function is correctly hardened where it matters: it is SECURITY DEFINER with search_path pinned to '', and its only effect is incrementing a single integer column. The only residual risk is an anonymous caller inflating a cosmetic view count, which has no security, financial, or data-integrity impact."),
  code(
`create function public.increment_property_views(pid text)
  returns void language sql
  security definer set search_path to ''
as $$ update public.properties set views = views + 1 where id = pid; $$;`,
  ),
)

// Closing
children.push(
  h1("9. Verification Approach"),
  body("Every database fix was verified against the live database by simulating the actual anon or investor session (via set role and request.jwt.claims) and attempting the exact attack, all inside transactions that were rolled back so no data changed. Application-layer fixes were verified with a clean type-check, live HTTP checks of the notify endpoint, confirmed response headers, and browser checks of the affected pages."),
  new Paragraph({
    spacing: { before: 240 },
    border: { top: { style: BorderStyle.SINGLE, size: 8, color: BRAND, space: 8 } },
    children: [
      new TextRun({ text: "End of document", italics: true, size: 20, color: "6B7280" }),
    ],
  }),
)

const doc = new Document({
  creator: "v0",
  title: "Amazon Homes Investor Portal — Security Implementation Documentation",
  description: "Security controls implemented following the security audit.",
  styles: {
    default: {
      document: { run: { font: "Calibri" } },
    },
  },
  sections: [
    {
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      children,
    },
  ],
})

const buffer = await Packer.toBuffer(doc)
writeFileSync("public/security-implementation.docx", buffer)
console.log("[v0] Wrote public/security-implementation.docx (" + buffer.length + " bytes)")
