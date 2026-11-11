# Suspension remediation — 2026-11-11

## Confirmed evidence

- Local browser bundles contained the configured Gemini key and Cloudinary secret.
- An old Git revision contained a Gemini key. Removing it in a later commit does not revoke it.
- The tracked environment example contained a Cloudinary secret; it is now replaced with a placeholder.
- Several Admin SDK function handlers did not verify the caller.
- These findings do not establish which activity caused Google's suspension. Cloud audit logs and Google's investigation are still required.

## Implemented and deployed

- AI and Google image requests use authenticated Netlify functions, server-held credentials, bounded payloads and shared request counters (12/user/minute, 120/global/minute, 1000/global/day). Provider billing limits still need configuration.
- Cloudinary deletion signs requests server-side and requires an explicitly trusted administrator.
- Password reset, index deployment, notification diagnostics/sending, topic administration and environment deployment require verified, non-revoked Firebase ID tokens and `ADMIN_UIDS`. Token saving is restricted to the authenticated UID.
- Sensitive variables are excluded from Vite's public environment allowlist, including dynamic environment reads. Both production build commands scan public output for configured secrets, private keys and unexpected Google keys.
- Existing local secret values were renamed to server-only variable names; this is NOT credential rotation.
- Production code is commit `b0b0810f9ff4e00d61a6c6ab65c64938cea8e8e6` from `test`, deployed on 2026-11-11. The live site remains locked to the reviewed deployment.

## Required deployment configuration

Set these in Netlify using newly rotated credentials. Prefer the **Functions** scope if the plan permits it; the current plan locks scope selection. Mark sensitive entries **Contains secret values**, enter production secrets only in the **Production** context, and leave local development and untrusted preview contexts empty. Server-only names and the Vite public allowlist remain required even when narrower scopes are unavailable:

- `GEMINI_API_KEY`: dedicated Gemini key; never reuse a Firebase Web key.
- `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID` if image search is used.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- `FIREBASE_SERVICE_ACCOUNT`: reviewed, least-privilege service account credential.
- `ADMIN_UIDS`: comma-separated Firebase Authentication UIDs verified by the owner. No administrator is permitted when this is unset. Do not trust client-writable role fields.

Remove legacy `VITE_GEMINI_API_KEY`, `VITE_GOOGLE_SEARCH_API_KEY` and `VITE_CLOUDINARY_API_SECRET` from Netlify. The local `.env.local` names were migrated without printing their values. Local server functions require `netlify dev`; plain `vite` does not serve them.

The deployment UI now emits server-only secret names and the server Cloudinary identifiers. Set `ADMIN_UIDS` and `FIREBASE_SERVICE_ACCOUNT` directly in Netlify before using the privileged deployment UI.

## Cloud actions still outstanding

1. Preserve suspension notifications and audit logs. Identify affected credential IDs, IAM changes, unexpected resources and charges.
2. Revoke exposed Gemini and Cloudinary credentials, and investigate/revoke compromised service account keys and sessions. Cloud credential changes are not performed by this patch.
3. Restrict the Firebase Web key to required Firebase APIs; exclude Generative Language API. Restrict the dedicated Gemini key separately. Check IAM, Security Rules, App Check and provider quotas.
4. Review publicly readable `app_config` for payment/other secrets and review all remaining payment endpoints and database rules separately. This patch is not a full security audit or proof of absence of compromise.
5. Deployment and unauthorized-request checks are complete. Authenticated workflows still require cloud access and replacement configuration. Old deployments, browser caches and Git history may retain old values, so revocation is essential. Do not clear clients' Firestore caches before assessing data recovery needs.
6. A factual follow-up appeal has been submitted requesting a secure remediation path and Firestore preservation/status confirmation. Await Google's response; do not represent uncompleted credential rotation as finished.

Do not recreate, delete or overwrite the Firestore database as part of this remediation.

## Cloud follow-up — 2026-11-11

- Opening the project's Google Cloud Credentials page redirected to the suspension appeal page; no credential inventory or revocation could be completed there.
- A follow-up appeal was submitted successfully. The console displayed: "Submitted request. Check your email for confirmation."
- The appeal accurately described local changes and passed checks, explicitly stated that deployment, cloud credential rotation and unauthorized-resource cleanup were not complete, and requested a secure remediation path, affected credential/resource identifiers, and Firestore preservation/status confirmation.
- Netlify's dashboard is at its login screen, so deployed environment settings and production branch have not yet been verified. No deployment or Git push has occurred.

## Deployment and subsequent checks — 2026-11-11

- The earlier login blocker was resolved. `jcigar` was not connected to Git; after explicit owner authorization, it was linked to `PeterYu8278/jcigar` with production branch `test`.
- Netlify deployment `6af3c096c3c6adba30bb8305` built successfully, deployed 12 functions, and was manually published to `https://jcigar.netlify.app/`. The production publish lock was retained.
- The production home page rendered. Unauthenticated requests to Gemini, image search, Cloudinary deletion, password reset, notification sending, index deployment and environment management returned 401 using supported methods; unsupported methods returned 405.
- A fresh Credentials-page check still redirected to the appeal page. Gmail contains the current appeal acknowledgment but no later reinstatement message as of this check. An older reinstatement notification is dated 2026-10-31 and does not resolve the new suspension.
- Added the non-sensitive `CLOUDINARY_CLOUD_NAME` server setting. It still needs a later deployment to be captured by function environments; no paid API feature was enabled.
- The Cloudinary Console currently requires owner login. A Netlify `CLOUDINARY_API_SECRET` form is prepared with **Contains secret values** checked and no secret entered or saved.
- Administrator identity is awaiting owner confirmation. Do not infer an application administrator UID from the Google Cloud owner's email.
- An unsent reply draft to the existing Google compliance thread records the successful production deployment. The owner chose the Cloud Console appeal route instead of email; the draft was not sent.
- A further Cloud Console appeal containing the live deployment ID, source revision, production endpoint verification and outstanding credential blockers was submitted at the owner's explicit request. A new Google appeal acknowledgment was received on 2026-11-11 at 09:24 Singapore time. No reinstatement has been confirmed.
- New credentials, credential revocation, review of unauthorized resources, and authenticated end-to-end verification remain outstanding.
