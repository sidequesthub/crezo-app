# App Review information (Guideline 2.1, Information Needed)

Reply text for App Store Connect, also stored in the version's App Review
Notes. Keep it current with each submission.

---

**1. Screen recording**

Attached: a recording on a physical iPhone running the latest iOS. It starts at
app launch and shows sign-up with Google Sign-In, the main features (a brand deal with deliverables, the content calendar, a media vault folder, and publishing a media kit page), and account deletion (Profile > Privacy & security > Delete my
account).

**2. Purpose and audience**

Crezo is a business app for independent content creators in India
(Instagram creators, YouTubers and similar). Creators earn from brand
collaborations but usually manage them in chats, notes and spreadsheets.
Crezo keeps the business side in one place: tracking each brand deal from
lead to paid, planning the posts they owe, creating GST-compliant invoices
as PDFs, sharing a media kit link with brands, and sorting their own camera
roll into folders per brand deal. All features are free during early access.

**3. Setup and access**

No demo account is needed. On the first screen, tap "Continue with Apple" (or
"Continue with Google") to create an account. A new account starts empty:
- Deals tab: tap + to add a deal (brand, value, status, deliverables).
- Profile > Invoices, or a deal: create an invoice and tap Preview to see the PDF.
- Calendar tab: tap + to plan a post and link it to a deal.
- Profile > Media kit: add platforms and rates, publish, and tap the link to
  open the public page.
- Vault tab: tap + to create a folder, then grant photo access and add
  existing photos to it. Media is never uploaded; Crezo stores only a
  reference to each item.
- Account deletion: Profile > Privacy & security > Delete my account.
No sample files are required.

**4. External services**

- Supabase: database, authentication and file storage (profile and media kit
  photos).
- Sign in with Apple and Google Sign-In: authentication.
- Vercel: hosts crezo.studio, including each creator's public media kit page.
- Expo (EAS): builds and app updates.
No payment processors, data providers, advertising, analytics or AI services
are used. The app contains no purchases.

**5. Regional differences**

The app is available in India only and behaves the same for every user.
Amounts are in Indian rupees and invoices follow Indian GST rules (CGST/SGST
or IGST at 18%, optional for creators who are not GST-registered).

**6. Regulated industry or third-party material**

Not applicable. Crezo helps creators prepare their own invoices and records;
it does not process payments, file taxes or give financial advice, and it
does not provide third-party protected content. Creators only see their own
data. Media kit pages contain only what the creator publishes about
themselves; there is no feed, messaging or browsing of other users' content
in the app.
