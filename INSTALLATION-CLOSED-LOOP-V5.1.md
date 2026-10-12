# DABO Closed Loop V5.1 — persisted approval boundary

## Scope
- POST `/api/closed-loop/proposals`: authenticated household member submits a fully validated operational plan. Returns `{proposalId,version,plan}` for user review.
- POST `/api/closed-loop/materialize`: **breaking contract**; accepts only `{proposalId,version:1,approved:true}`. Legacy `{plan,householdId,requestId,approved:true}` is rejected.
- SQL: `closed_loop_proposals` stores an immutable proposal; only the private service-role RPC can atomically materialize the exact stored plan and mark it executed. Replay returns existing need ID.
- No UI changes; do not deploy until Supabase migration has been applied and verified. V5.2 will implement review/approval UI.

## Installation order
1. Apply SQL migration in Supabase SQL Editor **before** deploying the API. Save and verify success.
2. Copy the `app/`, `supabase/`, `tests/` files into the repository.
3. Run `npm run verify`; check all tests/build.
4. Commit, push, confirm matching Vercel commit Ready.

## Security notes
- No direct table grants for authenticated or anonymous users. service_role has INSERT/SELECT for server-side proposal creation, not UPDATE/DELETE.
- Approval RPC uses row lock, version check, active membership, proposal ownership and the V4 atomic materialization function.
- Every plan change requires creating a new proposal; old proposals remain executable by their creator until executed. UI must make the selected proposal explicit. Expiration/revocation is a follow-up hardening before agent autonomy.
- Current V5.1 does not enable an autonomous agent to call approval. The browser UI must require a direct human action.
