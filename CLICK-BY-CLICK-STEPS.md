# CLICK-BY-CLICK — do it in this order

Everything happens in your hosting **File Manager** and in your **browser**. No terminal, no code editor, no typing inside files.

**Where you start:** hPanel → **Files** → **File Manager** → double-click **`public_html`**.

**You need only two files from me:**

| # | File | What it does |
|---|---|---|
| 1 | **`shivaa-update-v48-email-codes.zip`** | The whole update — **and it already contains the recovery file**, so this is the only upload you need for Parts 1–3 |
| 2 | `shivaa-upload-65-rings.zip` | Part 4 — the 65 rings |

> 🗑 **Ignore `shivaa-admin-recovery-FIXED.zip`** if you downloaded it earlier. That was the version you had to **edit by hand** — the thing that blocked you. It is replaced by the self-arming file inside the v48 zip.

---

# PART 1 — Upload the update (3 minutes)

1. hPanel → **Files** → **File Manager**.
2. Double-click **`public_html`**. You should see `index.html`, `api.php`, `js`, `data`, `uploads`.
3. Click **Upload** (↑ arrow, top-right toolbar).
4. Click **Select File** → choose **`shivaa-update-v48-email-codes.zip`**.
5. Wait for the bar to finish → **close** the Upload window (X).
6. **Right-click** the zip in the list → **Extract**.
7. The destination box shows `/public_html` — leave it → click **Extract**.
8. If it asks about **replacing existing files**, say **yes / replace**.
9. Right-click the zip → **Delete** (tidy up).

### Check it landed correctly
10. In `public_html` you should now see a **new** file called **`mail.php`**, plus **`admin-reset.php`**.
11. Open the **`js`** folder — `auth.js`, `app.js`, `admin.js` must be **inside it**. If they landed loose in `public_html` instead, stop and tell me — don't move them by hand.

✅ **Part 1 done. Nothing to configure — no keys, no settings.**

---

# PART 2 — Get back into the admin (5 minutes)

**No editing. The file arms itself.** To prove it is really you, it asks you to **create one empty file** — something nobody outside your hosting account can do.

### 1. Open the recovery page
1. New browser tab → **`https://shivaa.in/admin-reset.php`**
2. You will see **“Recovery file — arm it in 2 clicks”**.
   - **Red error box instead?** Copy that text to me word for word. It tells us exactly what is wrong.
   - **Blank page?** The file did not upload to the right folder — go back to Part 1 step 10 and check `admin-reset.php` sits next to `api.php`.

### 2. Create the file it asks for
3. On the page, under the heading **“Step 1 — create this file”**, there is a long file name. It looks like:
   **`shivaa-unlock-a1b2c3d4e5f6.txt`**
4. **Select it and copy it** (you cannot guess it — copy it exactly).
5. Go back to **File Manager → `public_html` → double-click `data`**.
6. Click **+ New File** (top-right toolbar).
7. **Paste** the name you copied → **Create**. Leave the file empty.
8. It should now appear in the `data` folder's list.
   - Can't find a **+ New File** button? Create it in `public_html` instead (same folder as `api.php`) — the page accepts either place.

### 3. Choose your key
9. Back on the recovery page, click the button / reload it. You should now see **“✓ Found it. Now choose your key below.”**
10. In **Recovery key**, type a key of **12 characters or more** — letters, numbers and dashes. Example: `shivaa-9f4b-2c71-jayal`
11. Type the same key in **Type it again**.
12. **Write the key down in your notes app now** — you type it on the very next screen.
13. Click **“Arm this recovery file”**.

### 4. Diagnose, then reset
14. The page now shows the recovery form. In **Recovery key**, type the key you just wrote down.
15. Click **“Check what is wrong (changes nothing)”**.
16. Read the table — it tells us whether the update is deployed, whether email/SMS is configured, and what mobile number each account has. **Send me a screenshot or 2–3 lines of it.**
17. In **Account**, pick your admin account — the one marked **★**.
18. In **New password**, type a password of **8+ characters** (letters + numbers + a symbol).
19. In **Type it again**, repeat it.
20. Click **“Set the new password”**.
21. You should see **“Password reset complete”**. 🎉

### 5. Confirm and close the door
22. Click the **/#/admin** link on that page (or open **`https://shivaa.in/#/admin`**).
23. Sign in with your email + the **new** password. You should land on the admin Overview.
24. That page tells you the file **“has deleted itself”**. To be sure: in **File Manager**, look for `admin-reset.php` in `public_html` — if it is still there, **right-click → Delete**.

> **Lost the key?** Open `https://shivaa.in/admin-reset.php` again and click **“Lost the key? Arm it again”** — it hands you a new file name and you repeat from step 5 above.

✅ **Part 2 done. From now on “Forgot password?” on the sign-in page is all you need.**

---

# PART 3 — Test that the codes arrive by email (3 minutes)

1. Go to **`https://shivaa.in/#/admin`** and sign in with your new password.
2. Left menu → **⚙ Settings**.
3. Scroll to the card **“Code delivery (SMS / email)”**.
4. In the box whose placeholder is *“your email — to test code delivery”*, type **your own email address**.
5. Click **“Send test code”**.
6. Expect a green line: **“Test code emailed to o••••@… ✓”**.
7. Open your email — **and the spam folder**. Look for **no-reply@shivaa.in**, subject **“Your Shivaa verification code”**, body = a 6-digit number.

### If no email arrives in 5 minutes
8. On that same card, look for a line saying **“Email error”** or **“Last error”**.
9. Send me that line word for word — it says exactly why your host refused, and I will switch it to a proper SMTP account.

### Now the real test
10. Open a **private / incognito window**.
11. Go to **`https://shivaa.in`** → **Sign in** → click **“Forgot password?”**.
12. Type your admin email → submit.
13. It should say the code went to something like **r•••@…** — check that inbox.
14. Enter the 6-digit code + your new password → done.

✅ **Part 3 done. The codes go to the account's email and are never shown on screen again.**

---

# PART 4 — Put the 65 rings live (when you're ready, ~10 minutes)

1. **File Manager → `public_html`** → click **+ Folder** → name it something random nobody would guess, e.g. **`rst-x7k2q`** → **Create**. Write it down.
2. **Double-click `rst-x7k2q`** → **Upload** → **`shivaa-upload-65-rings.zip`** → wait → close.
3. **Right-click** the zip → **Extract** → **Extract**. You should see **`ring_reset_bridge.php`**. Delete the zip.
4. ⚠️ **This one file DOES need one edit** — its `SETUP_KEY`. If the editor won't open it, use the trick in the box below.
5. **Right-click `ring_reset_bridge.php`** → **Edit** → find **`const SETUP_KEY = 'CHANGE-THIS-KEY-123';`** → replace the text inside the quotes with your own key, e.g. `'shivaa-rings-x7k2q-91ab'` → **Save Changes** → close.
6. New tab → **`https://shivaa.in/rst-x7k2q/ring_reset_bridge.php`**
7. Log in: **admin email** + **the SETUP_KEY from step 5** + **your admin password** → **Log in**.
8. **STEP 1 — “👁 Show what is live now”** → read the numbers (changes nothing).
9. **STEP 2 — “🗑 Delete all rings”** → confirm the popup. *(Step 3 puts them back.)*
10. **STEP 3 — “⬆ Publish next 4 rings”** → tap, wait for the ✅ lines, tap again… about **17 taps** until it says **“65/65 — ALL DONE”**. Any ❌ line? Tap the same button again — only the failed ones retry.
11. **STEP 4 — “🔍 Verify”** → you want: **65 rings, 0 without 4 images, 0 showing 0 in stock, 0 with video → PERFECT ✅**
12. Open 2–3 ring pages on your own site and look at the photos.
13. **STEP 5 — “💥 Delete this setup file”** → then in File Manager **delete the whole `rst-x7k2q` folder**.

---

# If a file won't open in the editor (this is what blocked you)

The in-browser editor is the flaky part of most hosting panels. Three ways round it, easiest first:

1. **You don't need it any more** for `admin-reset.php` — that file arms itself from the browser (Part 2). Only `ring_reset_bridge.php` (Part 4) still needs one line changed.
2. **Edit it on your computer instead:**
   - Right-click the file in File Manager → **Download**.
   - Open the downloaded file in **Notepad** (Windows) or **TextEdit** (Mac — Format → Make Plain Text first).
   - Change the line, **Save**, then **Upload** it back into the same folder and choose **replace**.
   - ⚠️ Never use Word or WordPad — they add invisible formatting that breaks PHP.
3. **It says “read only” or won't save:** right-click the file → **Permissions** → set **644** (folder `data` → **755**) → **Save** → try again.

**Also worth checking:** that you are editing the right copy. If a file appears both in `public_html` and inside a subfolder, you are looking at two different files — the one that runs is the one next to `api.php`.

---

# Send me these four things when done

1. **Part 2 step 16** — what the diagnosis table said (screenshot is fine).
2. **Part 3** — did the test code email arrive: inbox, spam, or nowhere? (plus the error line if nowhere)
3. **Part 4 step 11** — the exact Verify line.
4. Anything that looked wrong or stopped you.

**If something fails:** don't repeat the destructive steps (Part 4 step 9 especially). Tell me what the screen said and I will take it from there.
