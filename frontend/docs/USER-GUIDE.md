# GoldenWay User Guide

**The Bus For Us** — powered by Golden Arrow Bus Services

This guide shows you, step by step, how to use the GoldenWay app to manage
your bus travel: creating an account, loading trips onto your Gold Card,
tapping when you ride, and keeping track of your journeys.

No technical knowledge needed — just follow the steps below.

---

## 1. What is GoldenWay?

GoldenWay is the digital companion to the **Golden Arrow Gold Card**.

- Your phone becomes your ticket — tap it at the validator when you board.
- You buy **travel products** (Go Easy rides, Weekly or Monthly passes),
  not "money on a card".
- Your balance is protected once your card is registered to your account.
- Go Easy journeys include **1 free transfer** if you change buses within
  60 minutes.

---

## 2. Creating your account (once only)

1. Open the GoldenWay app. The first screen is the welcome page —
   tap **Sign Up**.
2. Fill in your details:
   - **Full Name** — your first name and surname
   - **Email Address** — use one you can access
   - **Phone Number** — a South African mobile number (e.g. `072 123 4567`)
   - **SA ID Number** — your 13-digit South African ID
   - **Gender** and **Date of Birth**
   - **Concession** — choose *Student* or *Pensioner* if you qualify
     (this gives you a discount once verified), otherwise leave *None*
   - **Password** — at least 8 characters, then type it again to confirm
3. Tick the box to accept the Terms & Conditions.
4. Tap **Sign Up**.

> **If something goes wrong:** the app tells you exactly which field needs
> fixing (for example "this ID number fails the checksum"). Correct the
> highlighted field and try again. If it says an account already exists,
> go back and tap **Login** instead.

5. You will see the **"Account Created Successfully"** screen.
   Tap **Start Riding** to go straight into the app.

**Good to know:** the first time you open the app, GoldenWay automatically
creates your Gold Card and links it to your account. You don't need to do
anything — your card number appears on the Home screen.

---

## 3. Logging in (every other time)

1. Open the app and tap **Login**.
2. Enter your email address and password.
3. Tap **Login**.

Forgot your password? Contact support through the **Support** tab.

---

## 4. The Home screen — everything at a glance

When you log in, the Home screen shows:

| What you see | What it means |
|---|---|
| Big number ("Journeys Left") | How many rides you have available right now |
| Pass badge ("Go Easy 5-Ride — Active") | The travel product currently on your card |
| **Load Trips** button | Appears when your card is empty — tap it to buy more trips |
| LIVE TRACKING map | A view of your bus route |
| Your Gold Card | Your card number, with "Balance protected" |
| Quick Actions | Shortcuts: Use Ticket, Top Up, Buy Pass, Support |
| Recent Activity | Your latest journeys and top-ups |

If GoldenWay has a **service alert** (delays, route changes), a red banner
appears at the very top of Home. Tap it for details.

---

## 5. Loading trips onto your card (buying travel)

This is the main thing you'll do. It takes under a minute:

1. Tap **Load Trips** (on Home, or the bottom menu).
2. **Step 1 — Choose your route:**
   - Tap **FROM** and pick where you start (e.g. *Bellville*).
   - Tap **TO** and pick where you're going (e.g. *City Bowl*).
   - The app shows the ticket plans available for that route with real prices.
   - Pick a plan:
     - **Go Easy 5 / 10 / 48-Ride** — a bundle of journeys, includes a free
       transfer per journey. Cheapest per ride on bigger bundles.
     - **Weekly / Monthly Pass** — unlimited travel on that one route.
   - Notice the **"You save R…"** line — that's how much you save compared
     to paying cash every trip.
   - Tap **Continue**.

> **Note:** on some routes Go Easy is not sold (excluded areas). The app
> will tell you: *"Go Easy is not available on this route. Please choose
> Weekly, Monthly, or cash."*

3. **Step 2 — Choose how to pay:**
   - Select a saved card, or tap **Add New Card** and fill in the card
     details.
   - The screen shows the total and the cash price for comparison.
   - Tap **Continue**.
4. **Step 3 — Check and pay:**
   - Confirm the route, pass, and total amount.
   - Tap **Pay Now**.
5. Done! You'll see **"Payment Successful"** with a **reference number**
   (like `GW-1234-AB9`). Write it down or copy it — it's your proof of
   purchase. Tap **View Receipt** for the full breakdown.

Your new trips are on your card immediately — the Home screen balance
updates straight away.

---

## 6. Riding the bus (tapping)

1. On the bus, open the app and tap **Use Ticket** (on Home, or on the
   Card screen).
2. Choose the route you are boarding from the **BOARDING ROUTE** list.
3. Tap **Tap to Validate**.
4. Hold your phone near the bus validator when prompted.
5. You'll see the confirmation screen:
   - **"Ride Successful!"** — one journey was used.
   - **"Free transfer!"** — you changed buses within 60 minutes, so this
     ride cost you nothing.

**If your card is empty:** the app shows *"Your card is empty"* with a
**Top Up Now** button — no rejected taps, no confusion.

---

## 7. Your Card screen

Tap **Card** in the bottom menu to see:

- Your Gold Card (with its number)
- Your status: **ACTIVE** (ready to ride) or **NO ACTIVE PASS**
- Journeys remaining and when your pass expires
- Recent transactions

---

## 8. Your journey history

Tap **History** in the bottom menu.

- See every journey and every top-up, newest first.
- Use the search box to find a specific trip.
- **MONTHLY TRIPS** shows how many rides you've taken this month;
  **TIME COMMUTING** is the approximate time you've spent on the road.

---

## 9. Your profile

Tap **Profile** in the bottom menu.

- Check your personal details (name, ID number, concession status).
- Tap **Edit Info** to update your details.
- Tap **Logout** when you're done (always do this on a shared phone).

---

## 10. Getting help

Tap **Support** in the bottom menu.

- Chat with a GoldenWay agent about delays, lost cards, or fare questions.
- Service alerts about your routes also appear on the Home screen.

---

## 11. For GoldenWay staff (back office)

Staff use the same backend but a separate login:

1. Go to the staff login (`/auth/staff/login` on the API, or the admin
   dashboard).
2. Log in with the email and password issued by your administrator.
3. What each role can do:

| Role | Can do |
|---|---|
| **ADMIN** | Everything: manage staff, refunds, view all commuters |
| **CLERK** | Verify student/pensioner concessions, edit routes & fares, view payments |
| **INSPECTOR** | Verify a commuter's card on the vehicle (balance + validity check) |

---

## 12. Quick troubleshooting

| Problem | What to do |
|---|---|
| "An account already exists" when signing up | You already registered — tap **Login** instead |
| Registration says my ID fails the checksum | Double-check all 13 digits of your SA ID number |
| Tap says "No journeys left" | Tap **Top Up Now** to load more trips |
| "Go Easy is not available on this route" | That route is an excluded area — choose Weekly or Monthly |
| Balance looks wrong | Open **History** and check your recent journeys and top-ups |
| App says it can't reach the service | Check your internet connection, then try again |

---

## 13. The rules of the road (business rules in plain language)

1. **Buy a product, not credit** — you load Go Easy rides or route passes.
2. **Register your card** — an unregistered card can still be loaded and
   tapped, but only a registered card protects your balance if lost.
3. **Tap = one journey** — the validator deducts a ride every time you board.
4. **Free transfer** — change buses within 60 minutes and the second ride
   is free (Go Easy products).
5. **Cheaper than cash** — card products always beat peak cash prices.
6. **Concessions** — students save 15%, pensioners 20%, once verified.
7. **Lost card?** Report it immediately — your balance is protected when
   the card is registered.

---

*GoldenWay — The Bus For Us. Rooted in the community since 1861.*
