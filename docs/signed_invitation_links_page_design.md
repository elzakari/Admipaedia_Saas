# Page Design — Signed Single-Use Invitation Links
Desktop-first UI with responsive collapse to single-column on small screens.

## Global Styles
- Layout system: CSS Grid for page shells; Flexbox for toolbars/forms.
- Spacing: 8px baseline; section padding 24–32px; card gap 16px.
- Colors: neutral background (#0B1220 / #F7F8FA), primary accent (brand), semantic states (green success, amber warning, red error).
- Typography: 14–16px body; 20–24px section titles; 32px page title.
- Buttons: primary (solid), secondary (outline), danger (red); hover = +4% brightness; disabled = 40% opacity.
- Links: underlined on hover; visited style optional.

---

## 1) Admin Dashboard (Invitations)
### Meta Information
- Title: “Invitations | Admin Dashboard”
- Description: “Generate and manage single-use invitation links.”
- Open Graph: title + description + app name.

### Page Structure
- Two-column shell: left sidebar navigation (fixed width), right main content.
- Main content uses stacked sections: “Create Invite” then “Invites List” then “Audit Drawer/Panel”.

### Sections & Components
1. Top Bar
   - Breadcrumb: Admin / Invitations
   - Right actions: “Help” (optional), user menu.

2. Create Invite Card
   - Fields (inline grid):
     - Invite Type (segmented control or select): Parent / Teacher / General
     - Expiry (number input + unit “days”, default 7)
   - Primary CTA: “Generate Link”
   - Output area (appears after generation):
     - Readonly URL field
     - “Copy link” button
     - Small note: “Single-use. Expires on {date}.”
   - Error area: rate limit errors and validation errors shown inline.

3. Invites List Table
   - Columns: Type, Status, Created, Expires, Created By, Consumed (date/user), Actions
   - Filters row: Status dropdown; Type dropdown; Search by invite id (optional)
   - Row actions:
     - “View audit” (opens right drawer)
     - “Revoke” (only if active; confirm modal)

4. Audit Drawer (Right side)
   - Header: Invite ID + status pill
   - Timeline list grouped by date: created/viewed/consumed/revoked/expired/rate-limited
   - Each event shows: timestamp, event type, actor (if any), client_id (if provided)

### Responsive Behavior
- <1024px: sidebar collapses to icon rail; table becomes horizontally scrollable.
- <640px: Create card stacks fields vertically; audit drawer becomes full-screen modal.

---

## 2) Invite Acceptance & Registration
### Meta Information
- Title: “Accept Invitation”
- Description: “Validate your invitation and create your account.”
- Open Graph: safe generic (avoid exposing school or role in OG).

### Page Structure
- Centered single-column layout (max-width 520–600px) on neutral background.
- Card-based content with clear state switching.

### Sections & Components
1. Validation State Header
   - Status banner:
     - Valid: “Invitation verified”
     - Invalid/Expired/Revoked/Used: specific message + support guidance

2. Invite Details (valid state only)
   - Read-only fields: “Account Type: Parent/Teacher/General”, “Expires: {date}”

3. Registration Form (valid state only)
   - Inputs: Email, Password, Confirm Password (or your existing standard fields)
   - Primary CTA: “Create Account”
   - Loading state blocks double-submit
   - Error mapping:
     - If consume fails (already used): show “This link was just used. Request a new invite.”

4. Success State
   - Check panel: “Account created and invitation accepted.”
   - CTA: “Continue” (to login/home)

### Responsive Behavior
- Always single-column; padding reduces on small screens.

---

## 3) Login
### Meta Information
- Title: “Login”
- Description: “Sign in to manage your school.”

### Page Structure
- Same centered card pattern as registration for consistency.

### Sections & Components
- Email + password fields
- Primary CTA: “Sign in”
- Error banner for invalid credentials
- Post-login redirect to /admin/invitations for School Admins

