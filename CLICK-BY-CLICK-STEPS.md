# CLICK-BY-CLICK — do it in this order

Three jobs, in this order. Everything happens in your hosting **File Manager** and your **website**. No terminal, no code knowledge needed.

**Where you are going:** logging in to hPanel → **Files → File Manager**.

**Have these three files from me** (download them from this chat/workspace to your computer):

| # | File | Used in |
|---|---|---|
| 1 | `shivaa-admin-recovery-FIXED.zip` | Part 1 — get back in |
| 2 | `shivaa-update-v48-email-codes.zip` | Part 2 — codes by email |
| 3 | `shivaa-upload-65-rings.zip` | Part 4 — the 65 rings |

⚠️ **Do Part 1 fully (including deleting the file) before Part 2.** Part 2 contains its own (switched-off) copy of that file and would overwrite the one you armed.

---

# PART 1 — Get back into the admin (5 minutes)

### 1. Open File Manager
1. Log in to **hPanel**.
2. Click **Files** in the left menu → **File Manager**.
3. In the left tree, **double-click `public_html`**. You should see `index.html`, `api.php`, `js`, `data`, `uploads`.

### 2. Upload the recovery file
4. Click **Upload** (the ↑ arrow, top-right toolbar).
5. Click **Select File** (or drag the file in) → choose **`shivaa-admin-recovery-FIXED.zip`**.
6. Wait for the progress bar to finish → **close the Upload window** (X).
7. Find the new `shivaa-admin-recovery-FIXED.zip` in the file list.
8. **Right-click** it → **Extract**.
9. The destination box shows the current folder (`/public_html`) — leave it → click **Extract**.
10. Result: **`admin-reset.php`** now appears in the list. (If the old `admin-reset.php` was already there, let it **replace** it.)

### 3. Arm it with your own key
11. **Right-click `admin-reset.php`** → **Edit**.
12. Near the top you will see these two lines:
    ```
    const ENABLED = false;
    const RECOVERY_KEY = 'CHANGE-THIS-KEY-123';
    ```
13. Change **`false`** to **`true`**.
14. Replace **`CHANGE-THIS-KEY-123`** with your own long private text, typed inside the quotes. Example:
    ```
    const RECOVERY_KEY = 'shivaa-9f4b-2c71-jayal-nagaur-4417';
    ```
    Write this key down in your notes app — you will type it on the next screen.
15. Click **Save Changes** (top-right) → close the editor.

### 4. Open the recovery page
16. Open a **new browser tab** → go to:
    **`https://shivaa.in/admin-reset.php`**
17. You will see “Shivaa — password recovery” with three boxes. **If instead you see a red error box**, copy that text and send it to me — don't guess.
18. In **Recovery key**, type the key from step 14.
19. Click **“Check what is wrong (changes nothing)”**.
20. Read the table it shows (it tells us whether the update is deployed, whether email/SMS is configured, and what mobile each account has). **Take a screenshot or copy 2–3 lines for me.**

### 5. Set your new password
21. In **Account**, pick your admin account — the one **marked ★**.
22. In **New password**, type a password of **8 characters or more**. (Use letters + numbers + a symbol.)
23. In **Type it again**, type the same password.
24. Click **“Set the new password”**.
25. You should see **“Password reset complete”** with the number of signed-out sessions. 🎉

### 6. Sign in and close the door
26. Click the **/#/admin** link on that page (or open **`https://shivaa.in/#/admin`**).
27. Sign in with your email + the **new** password. You should land on the admin Overview.
28. **Back in File Manager:** **right-click `admin-reset.php`** → **Delete** → confirm. (Do this now — Part 2 does not need it.)
29. Also delete `shivaa-admin-recovery-FIXED.zip` if it is still in the file list.

✅ **Part 1 done. You are back in.**

---

# PART 2 — Upload the update that emails the codes (5 minutes)

### 1. Upload
1. Still in **File Manager → `public_html`**.
2. Click **Upload** → **Select File** → choose **`shivaa-update-v48-email-codes.zip`**.
3. Wait for it to finish → close the Upload window.
4. **Right-click** the zip → **Extract** → destination stays `/public_html` → **Extract**.
5. If it asks about **replacing/overwriting existing files**, say **yes / replace**.
6. Delete the zip: right-click `shivaa-update-v48-email-codes.zip` → **Delete**.

### 2. Check the files landed correctly
7. In `public_html` you should now see **`mail.php`** (a brand-new file) alongside `api.php` and `index.html`.
8. Open the **`js`** folder — `auth.js`, `app.js`, `admin.js` must be inside it (not in `public_html` itself). If they landed loose in `public_html`, tell me — don't fix it by hand.

### 3. There is nothing to configure
No keys, no settings. It works out of the box using your host's mail service.

---

# PART 3 — Test that the codes arrive (3 minutes)

### 1. Open the admin dashboard
1. Go to **`https://shivaa.in/#/admin`**.
2. Sign in with your new password.
3. In the left menu click **⚙ Settings**.
4. Scroll to the card titled **“Code delivery (SMS / email)”**.

### 2. Send yourself a test
5. In the second box (placeholder “your email — to test code delivery”), type **your own email address**.
6. Click **“Send test code”**.
7. You should see a green message: *“Test code emailed to o••••@… ✓”*.
8. Open your email — **and the spam folder**. Look for **no-reply@shivaa.in**, subject **“Your Shivaa verification code”**, containing a 6-digit number.

### 3. If the email does not arrive within 5 minutes
9. Go back to that same card. Look for a line saying **“Email error”** or **“Last error”**.
10. Send me that line, word for word. That tells us exactly why your host refused it, and I will switch it to a proper SMTP account.

### 4. Test the real thing (this is the point of all of it)
11. Open a **private/incognito window** (or sign out).
12. Go to **`https://shivaa.in`** → click **Sign in**.
13. Click **“Forgot password?”**.
14. Type your admin email → submit.
15. It should say the code was sent to something like **r•••@…** — check that inbox.
16. Enter the 6-digit code + your new password → done.
17. Sign in with the new password.

✅ **From now on, “Forgot password?” is all you need. The recovery file is only for the day email itself fails.**

---

# PART 4 — Put the 65 rings live (when you're ready, ~10 minutes)

### 1. Make a private folder
1. **File Manager → `public_html`**.
2. Click **+ Folder** (top-right toolbar).
3. Name it something random that nobody would guess — e.g. **`rst-x7k2q`**. Write it down.
4. Click **Create**.

### 2. Put the setup file in it
5. **Double-click `rst-x7k2q`** to open the folder.
6. **Upload** → **Select File** → **`shivaa-upload-65-rings.zip`** → wait → close.
7. **Right-click** the zip → **Extract** → **Extract**.
8. You should see **`ring_reset_bridge.php`**. Delete the zip (right-click → Delete).

### 3. Give it your own key
9. **Right-click `ring_reset_bridge.php`** → **Edit**.
10. Find **`const SETUP_KEY = 'CHANGE-THIS-KEY-123';`**
11. Replace the text inside the quotes with your own long random key. Example: `'shivaa-rings-x7k2q-91ab'`
12. **Save Changes** → close the editor.

### 4. Open it and log in
13. New tab → **`https://shivaa.in/rst-x7k2q/ring_reset_bridge.php`**
14. Log in: **admin email** + **the setup key from step 11** + **your admin password** → **Log in**.

### 5. Tap the buttons, top to bottom
15. **STEP 1 — “👁 Show what is live now”** → read the numbers. Changes nothing.
16. **STEP 2 — “🗑 Delete all rings”** → confirm the popup. *(The next step puts them back.)*
17. **STEP 3 — “⬆ Publish next 4 rings”** → tap it, wait for the ✅ lines, **tap again**… repeat until it says **“65/65 — ALL DONE”** (about 17 taps, ~2 minutes).
    - Any line showing ❌ → just tap the same button again; only the failed ones are retried.
18. **STEP 4 — “🔍 Verify”** → you want: **65 rings, 0 without 4 images, 0 showing 0 in stock, 0 with video → PERFECT ✅**
19. Open 2–3 ring pages on your site yourself and look at the photos.
20. **STEP 5 — “💥 Delete this setup file”** → then in File Manager **delete the whole `rst-x7k2q` folder**.

✅ **65 rings live, old ones replaced, no duplicates.**

---

# Send me these four things when done

1. From **Part 1 step 19**: what the diagnosis table said (screenshot is fine).
2. From **Part 3**: did the test code email arrive — inbox, spam, or nowhere? (and the error line if nowhere)
3. From **Part 4 step 18**: the exact Verify line.
4. Anything that looked wrong or stopped you.

**Order of panic, if something fails:** don't repeat destructive steps. Part 1's file is only used once — if you ever need it again, delete `data/.admin-reset-used` in File Manager (inside `public_html/data`), re-arm the file, and use it again.
