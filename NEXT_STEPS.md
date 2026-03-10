# Midify Complete Setup Guide 🚀

This document will guide you through setting up everything necessary to make Midify fully functional! I have implemented the UI (Electron + Vite app in `desktop-client/`) and the background logic for generating the AI MIDIs (`api-server/`).

To get everything running for real (not just mocks), you will need to provision external services (Supabase, Replicate, Stripe), configure the databases, and run the backend servers.

---

## 1. Supabase (Database & Authentication) Setup

Supabase will act as your User directory, your relational database for generation history, and your storage bucket for the `.mid` files.

### 1.1 Create the Project
1. Go to [https://supabase.com/](https://supabase.com/).
2. Click "New Project", select your organization, and choose a region close to you. Keep your password safe.

### 1.2 Enable Authentication
1. Go to the **Authentication** tab > **Providers**.
2. **Email** is enabled by default. Since you are running locally (or testing desktop), you may need to disable the "Confirm email" toggle temporarily if you don't want to wire up Resend or SMTP right away, to allow instant sign-ups.

### 1.3 Create Database Elements (SQL Setup)
Go to the **SQL Editor** in your Supabase dashboard and run the following commands sequentially. This creates the exact tables our codebase expects:

```sql
-- Create a table for users to track their credits
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  credits INT DEFAULT 50 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: In production you'd want RLS triggers, but here is a simple insert trigger for signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create generations table
CREATE TABLE generations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  midi_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, error
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.4 Setting up RLS (Row Level Security)
Also in the SQL Editor:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to CRUD their own generations
CREATE POLICY "Users can view own generations" ON generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations" ON generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 1.5 Create the Storage Bucket
1. Go to **Storage > New Bucket**.
2. Name the bucket `midis`.
3. Make it a **Public bucket** (so Electron can stream/download files without complex auth loops for now).
4. Add a policy under "Policies" for the bucket: Allow All `SELECT` operations for anyone, and if you want `INSERT` via the API, the backend service role will override this anyway. So you're good!

---

## 2. Replicate (AI MIDI Generation)

1. Create an account at [replicate.com](https://replicate.com/).
2. Grab your `REPLICATE_API_TOKEN` from the API tokens page.
3. This is already wired up inside `api-server/src/app/api/inngest/route.ts` to use `sander-wood/text-to-midi`, which outputs `.mid` binary data.

---

## 3. Stripe (Payments & Credits) - Deferred

For phase 1, every new user automatically receives `50 credits` (defined in our SQL trigger from step 1.3). You can set up Stripe later, but when you do:
1. Create a "Payment Link" on Stripe.
2. The user will be redirected there.
3. You'll create a Next.js API endpoint (e.g., `/api/webhooks/stripe`) to catch the 'payment success' notification and `UPDATE profiles SET credits = credits + 50 WHERE id = ...`.

---

## 4. Environment Variables Configuration

I generated `.env.example` files in both directories. You MUST copy these to a `.env` file (or `.env.local` for Next.js) and fill them in with real keys.

### Next.js API Server (`api-server/.env.local`)
```ini
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... (Find this in Settings > API > service_role. STRICTLY KEEP THIS SECRET)
REPLICATE_API_TOKEN=r8_... 

# Inngest needs these for local dev
INNGEST_EVENT_KEY=local
INNGEST_SIGNING_KEY=local
```

### Electron App (`desktop-client/.env`)
```ini
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
*(Supabase credentials for the Vite app are strictly public `anon` keys. The electron client uses this to log the user in via React, while the NextJS API uses the `service_role_key` to bypass security and do file uploads).*

---

## 5. Running the System Locally

Because this is a decoupled architecture with background workers, you need **3 terminals open** to run the full workflow locally.

**Terminal 1: Next.js API Server**
```bash
cd api-server
npm install
npm run dev
```

**Terminal 2: Inngest Dev Server**
The Inngest Dev Server orchestrates the local queues and retries.
```bash
npx inngest-cli@latest dev
```
*(This will run on `http://localhost:8288`. It auto-discovers our Next.js API at port 3000!).*

**Terminal 3: Electron Application**
```bash
cd desktop-client
npm install
npm run dev
```
*(The VITE terminal will auto-spawn the transparent Electron window over your desktop).*

---

## 6. What Needs to be Built Next?

Right now, the front-end has the *Visual UI/UX*, and the backend has the *Business Logic*. In the next session, we should connect them!

1. **Authentication UI**: Replace the hardcoded `credits = 50` in `App.tsx` with checking `supabase.auth.getUser()`. If no user exists, show a generic beautiful glassmorphic Login pane.
2. **Dispatch Event**: Hook up the "Generate" button so it does a `fetch` request to our local Next.js `/api/generate` route, which will then push a message to Inngest (`inngest.send({ name: 'app/generate-midi' })`).
3. **MIDI Player JS**: Integrate `midi-player-js` logic on the frontend so clicking the little "Play" icon synthesizes the audio url stored in Supabase into local device audio.
4. **Native Drag Drop Handler**: Hook up the `ipcRenderer`-to-`ipcMain` bridge to use `event.sender.startDrag()` so that you can drag the React components directly into Ableton.
