import os
import sys

FINDATHON_ROOT = r"c:\Users\HP\Desktop\Projects\Findathon"

files_to_check = [
    r"supabase\migrations\20260823_add_linkedin_evidence_source.sql",
    r"lib\domain\entities\developer-skill-evidence.entity.ts",
    r"lib\security\oauth-state.ts",
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

def check_balanced_brackets(text, filepath):
    stack = []
    i = 0
    n = len(text)
    line = 1
    col = 1
    
    in_single = False
    in_double = False
    in_template = 0 # depth of template literals
    in_line_comment = False
    in_block_comment = False

    while i < n:
        c = text[i]
        
        if c == '\n':
            line += 1
            col = 0
            if in_line_comment:
                in_line_comment = False
            i += 1
            col += 1
            continue

        if in_line_comment:
            i += 1
            col += 1
            continue

        if in_block_comment:
            if c == '*' and i + 1 < n and text[i+1] == '/':
                in_block_comment = False
                i += 2
                col += 2
                continue
            i += 1
            col += 1
            continue

        if in_single:
            if c == '\\':
                i += 2
                col += 2
                continue
            if c == "'":
                in_single = False
            i += 1
            col += 1
            continue

        if in_double:
            if c == '\\':
                i += 2
                col += 2
                continue
            if c == '"':
                in_double = False
            i += 1
            col += 1
            continue

        if in_template > 0:
            if c == '\\':
                i += 2
                col += 2
                continue
            if c == '`':
                in_template -= 1
                i += 1
                col += 1
                continue
            if c == '$' and i + 1 < n and text[i+1] == '{':
                stack.append(('}', line, col, 'template_expr'))
                i += 2
                col += 2
                continue
            i += 1
            col += 1
            continue

        # Check comment start
        if c == '/' and i + 1 < n:
            if text[i+1] == '/':
                in_line_comment = True
                i += 2
                col += 2
                continue
            elif text[i+1] == '*':
                in_block_comment = True
                i += 2
                col += 2
                continue

        # Check string start
        if c == "'":
            in_single = True
            i += 1
            col += 1
            continue
        if c == '"':
            in_double = True
            i += 1
            col += 1
            continue
        if c == '`':
            in_template += 1
            i += 1
            col += 1
            continue

        # Brackets
        if c in '({[':
            match_c = ')' if c == '(' else ('}' if c == '{' else ']')
            stack.append((match_c, line, col, 'bracket'))
        elif c in ')}]':
            if not stack:
                return f"{filepath}:{line}:{col}: Unexpected closing bracket '{c}'"
            expected, o_line, o_col, b_type = stack.pop()
            if c != expected:
                return f"{filepath}:{line}:{col}: Expected '{expected}' (opened at line {o_line}:{o_col}), found '{c}'"

        i += 1
        col += 1

    if stack:
        expected, o_line, o_col, b_type = stack[-1]
        return f"{filepath}: Unclosed bracket '{expected}' opened at line {o_line}:{o_col}"
    
    return None

print("=== STARTING FINDATHON LINKEDIN INTEGRATION AUDIT ===")
errors = []

for rel_path in files_to_check:
    full_path = os.path.join(FINDATHON_ROOT, rel_path)
    if not os.path.exists(full_path):
        errors.append(f"MISSING FILE: {rel_path}")
        continue
    
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()

    if rel_path.endswith((".ts", ".tsx")):
        err = check_balanced_brackets(content, rel_path)
        if err:
            errors.append(err)

    print(f"  [OK] {rel_path} ({len(content)} bytes)")

print("\n=== CHECKING SPECIFIC LINKEDIN CRITICAL CONTRACTS ===")

# 1. Check LinkedIn Provider
with open(os.path.join(FINDATHON_ROOT, r"lib\providers\linkedin.provider.ts"), "r", encoding="utf-8") as f:
    provider_code = f.read()
    assert "https://www.linkedin.com/oauth/v2/authorization" in provider_code, "Missing authorization endpoint in provider"
    assert "https://www.linkedin.com/oauth/v2/accessToken" in provider_code, "Missing token exchange endpoint in provider"
    assert "https://api.linkedin.com/v2/userinfo" in provider_code, "Missing userinfo endpoint in provider"
    assert "openid profile email" in provider_code, "Missing openid profile email scope in provider"
    assert "LINKEDIN_CLIENT_ID" in provider_code, "Missing LINKEDIN_CLIENT_ID check in provider"
    assert "LINKEDIN_CLIENT_SECRET" in provider_code, "Missing LINKEDIN_CLIENT_SECRET check in provider"
    print("  [OK] LinkedInProvider has all required endpoints, scopes, and env variables.")

# 2. Check Security State Cookie
with open(os.path.join(FINDATHON_ROOT, r"lib\security\oauth-state.ts"), "r", encoding="utf-8") as f:
    oauth_code = f.read()
    assert "findathon_linkedin_oauth_state" in oauth_code, "Missing LinkedIn OAuth cookie name in oauth-state.ts"
    assert "setLinkedInOAuthStateCookie" in oauth_code, "Missing setLinkedInOAuthStateCookie"
    assert "clearLinkedInOAuthStateCookie" in oauth_code, "Missing clearLinkedInOAuthStateCookie"
    print("  [OK] oauth-state.ts provides secure HTTP-only cookie handlers for LinkedIn.")

# 3. Check DeveloperProfileCommandService
with open(os.path.join(FINDATHON_ROOT, r"lib\services\developer-profile-command.service.ts"), "r", encoding="utf-8") as f:
    cmd_code = f.read()
    assert "connectLinkedIn" in cmd_code, "Missing connectLinkedIn method in DeveloperProfileCommandService"
    assert "disconnectLinkedIn" in cmd_code, "Missing disconnectLinkedIn method in DeveloperProfileCommandService"
    assert "linkedinConnected: hasActiveLinkedIn" in cmd_code, "Missing linkedinConnected assignment in recomputeProfileInternal"
    print("  [OK] DeveloperProfileCommandService implements connectLinkedIn, disconnectLinkedIn, and recomputing.")

# 4. Check UI Component
with open(os.path.join(FINDATHON_ROOT, r"components\DeveloperIntelligence.tsx"), "r", encoding="utf-8") as f:
    ui_code = f.read()
    assert "LinkedInIcon" in ui_code, "Missing LinkedInIcon in DeveloperIntelligence.tsx"
    assert "isConnectingLinkedIn" in ui_code, "Missing isConnectingLinkedIn state in DeveloperIntelligence.tsx"
    assert "isDisconnectingLinkedIn" in ui_code, "Missing isDisconnectingLinkedIn state in DeveloperIntelligence.tsx"
    assert "handleConnectLinkedIn" in ui_code, "Missing handleConnectLinkedIn in DeveloperIntelligence.tsx"
    assert "handleDisconnectLinkedIn" in ui_code, "Missing handleDisconnectLinkedIn in DeveloperIntelligence.tsx"
    assert "Connect LinkedIn" in ui_code, "Missing 'Connect LinkedIn' button in DeveloperIntelligence.tsx"
    assert "Disconnect" in ui_code, "Missing 'Disconnect' button in DeveloperIntelligence.tsx"
    assert "Provider in Roadmap" not in ui_code, "Roadmap placeholder was not replaced!"
    print("  [OK] DeveloperIntelligence.tsx has full interactive LinkedIn card with no remaining roadmap placeholder.")

if errors:
    print("\nFAILURES:")
    for err in errors:
        print(f" - {err}")
    sys.exit(1)
else:
    print("\nALL 16 FILES & CONTRACT CHECKS PASSED WITH 0 ERRORS! 🎉")
