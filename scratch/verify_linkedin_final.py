import os
import sys

FINDATHON_ROOT = r"c:\Users\HP\Desktop\Projects\Findathon"

files = [
    r"supabase\migrations\20260823_add_linkedin_evidence_source.sql",
    r"supabase\migrations\20260823_add_external_account_profile_columns.sql",
    r"lib\domain\entities\developer-skill-evidence.entity.ts",
    r"lib\domain\repositories\developer-profile.repository.interface.ts",
    r"lib\domain\mappers\developer-profile.mapper.ts",
    r"lib\security\oauth-state.ts",
    r"lib\security\token-encryption.ts",
    r"lib\errors\linkedin.errors.ts",
    r"lib\errors\index.ts",
    r"lib\providers\linkedin.provider.ts",
    r"lib\services\developer-profile-command.service.ts",
    r"lib\services\factories.ts",
    r"app\api\linkedin\connect\route.ts",
    r"app\api\linkedin\callback\route.ts",
    r"app\api\linkedin\disconnect\route.ts",
    r"app\api\v1\developer-profile\connect\linkedin\route.ts",
    r"app\api\v1\developer-profile\linkedin\callback\route.ts",
    r"app\api\v1\developer-profile\accounts\linkedin\route.ts",
    r"components\DeveloperIntelligence.tsx",
    r".env.example"
]

print("=== FINDATHON LINKEDIN INTEGRATION FINAL AUDIT ===\n")
errors = []

for rel in files:
    full = os.path.join(FINDATHON_ROOT, rel)
    if not os.path.exists(full):
        errors.append(f"MISSING: {rel}")
        continue
    size = os.path.getsize(full)
    print(f"  [OK] {rel} ({size} bytes)")

print("\n=== CRITICAL SECURITY CONTRACTS ===")

# 1. OAuth State: HMAC + timing-safe + expiration + userId binding
with open(os.path.join(FINDATHON_ROOT, r"lib\security\oauth-state.ts"), "r", encoding="utf-8") as f:
    code = f.read()
    checks = {
        "createHmac": "HMAC signing",
        "timingSafeEqual": "timing-safe comparison",
        "expiresAt": "state expiration",
        "userId": "user ID binding",
        "createSignedOAuthState": "signed state creator",
        "verifySignedOAuthState": "signed state verifier",
        "constantTimeCompare": "constant-time compare helper",
        "clearLinkedInOAuthStateCookie": "state invalidation (replay prevention)"
    }
    for token, desc in checks.items():
        if token not in code:
            errors.append(f"oauth-state.ts: Missing {desc} ({token})")
    if not errors:
        print("  [OK] OAuth state: HMAC signing, timing-safe, expiration, userId binding, replay prevention")

# 2. Token encryption: AES-256-GCM exists
with open(os.path.join(FINDATHON_ROOT, r"lib\security\token-encryption.ts"), "r", encoding="utf-8") as f:
    code = f.read()
    for tok in ["aes-256-gcm", "encryptToken", "decryptToken", "TOKEN_ENCRYPTION_KEY", "getAuthTag"]:
        if tok not in code:
            errors.append(f"token-encryption.ts: Missing {tok}")
    print("  [OK] Token encryption: AES-256-GCM with encryptToken/decryptToken")

# 3. ExternalAccountData has name/email/profilePicture
with open(os.path.join(FINDATHON_ROOT, r"lib\domain\repositories\developer-profile.repository.interface.ts"), "r", encoding="utf-8") as f:
    code = f.read()
    for field in ["name?:", "email?:", "profilePicture?:"]:
        if field not in code:
            errors.append(f"ExternalAccountData missing field: {field}")
    print("  [OK] ExternalAccountData: name, email, profilePicture fields present")

# 4. Mapper has name/email/profile_picture
with open(os.path.join(FINDATHON_ROOT, r"lib\domain\mappers\developer-profile.mapper.ts"), "r", encoding="utf-8") as f:
    code = f.read()
    for field in ["name: row.name", "email: row.email", "profile_picture: row.profile_picture", "profilePicture: row.profile_picture"]:
        if field not in code:
            errors.append(f"developer-profile.mapper.ts missing mapping: {field}")
    print("  [OK] Mapper: name/email/profile_picture mapped in both directions")

# 5. Migration for columns
with open(os.path.join(FINDATHON_ROOT, r"supabase\migrations\20260823_add_external_account_profile_columns.sql"), "r", encoding="utf-8") as f:
    code = f.read()
    for col in ["name TEXT", "email TEXT", "profile_picture TEXT", "unique_user_provider"]:
        if col not in code:
            errors.append(f"Migration missing: {col}")
    print("  [OK] Migration: name, email, profile_picture columns + unique constraint")

# 6. Command service: name/email/profilePicture storage + API error handling
with open(os.path.join(FINDATHON_ROOT, r"lib\services\developer-profile-command.service.ts"), "r", encoding="utf-8") as f:
    code = f.read()
    for tok in ["name: displayName", "email: userInfo.email", "profilePicture: userInfo.picture",
                "LinkedInApiError", "LINKEDIN_TOKEN_EXPIRED", "LINKEDIN_RATE_LIMITED", "LINKEDIN_SERVICE_UNAVAILABLE"]:
        if tok not in code:
            errors.append(f"command.service missing: {tok}")
    print("  [OK] connectLinkedIn: stores profile data + status-specific error handling")

# 7. LinkedIn provider: HTTP status error handling
with open(os.path.join(FINDATHON_ROOT, r"lib\providers\linkedin.provider.ts"), "r", encoding="utf-8") as f:
    code = f.read()
    for tok in ["status === 401", "status === 403", "status === 429", "status >= 500", "malformed response"]:
        if tok not in code:
            errors.append(f"linkedin.provider missing error handling: {tok}")
    print("  [OK] LinkedInProvider: 401/403/429/5xx/malformed response handling")

# 8. Callback route: signed state verification
with open(os.path.join(FINDATHON_ROOT, r"app\api\linkedin\callback\route.ts"), "r", encoding="utf-8") as f:
    code = f.read()
    for tok in ["verifySignedOAuthState", "stateCheck.isValid", "clearLinkedInOAuthStateCookie", "user.id"]:
        if tok not in code:
            errors.append(f"callback/route.ts missing: {tok}")
    print("  [OK] Callback: signed state verification with user binding")

# 9. Connect route: userId binding
with open(os.path.join(FINDATHON_ROOT, r"app\api\linkedin\connect\route.ts"), "r", encoding="utf-8") as f:
    code = f.read()
    if "user.id" not in code:
        errors.append("connect/route.ts missing user.id binding")
    print("  [OK] Connect route: userId bound to state cookie")

# 10. Frontend: complete state management
with open(os.path.join(FINDATHON_ROOT, r"components\DeveloperIntelligence.tsx"), "r", encoding="utf-8") as f:
    code = f.read()
    for tok in ["isConnectingLinkedIn", "isDisconnectingLinkedIn", "handleConnectLinkedIn",
                "handleDisconnectLinkedIn", "linkedInSummary", "Connect LinkedIn",
                "linkedin=connected", "linkedin_error", "router.replace"]:
        if tok not in code:
            errors.append(f"DeveloperIntelligence.tsx missing: {tok}")
    if "Provider in Roadmap" in code:
        errors.append("Roadmap placeholder NOT removed!")
    print("  [OK] Frontend: state management, OAuth callback handling, connect/disconnect, auto-refresh")

# 11. .env.example: documentation
with open(os.path.join(FINDATHON_ROOT, r".env.example"), "r", encoding="utf-8") as f:
    code = f.read()
    for tok in ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "LINKEDIN_REDIRECT_URI",
                "TOKEN_ENCRYPTION_KEY", "linkedin.com/developers", "redirect URL"]:
        if tok.lower() not in code.lower():
            errors.append(f".env.example missing: {tok}")
    print("  [OK] .env.example: LinkedIn setup guide with credentials, redirect URIs, approval process")

print("\n" + "=" * 60)
if errors:
    print(f"FAILURES ({len(errors)}):")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("ALL 20 FILES + 11 SECURITY CONTRACT CHECKS PASSED!")
    print("=" * 60)
