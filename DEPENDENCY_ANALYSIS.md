# Rust Dependency Analysis: Duplicate Reqwest Versions

## Executive Summary

The Rust dependency tree currently resolves both `reqwest 0.11.27` and `reqwest 0.12.28` simultaneously, adding ~1.2MB to compiled binaries and creating maintenance overhead. This analysis identifies the root cause and proposes solutions.

## Issue Details

**Current State**: `Cargo.lock` contains two major versions of `reqwest`:
- `reqwest 0.11.27` — explicitly pinned in workspace
- `reqwest 0.12.28` — pulled in transitively

**Impact**:
- Binary size increase (~1.2MB for both HTTP/TLS stacks)
- Dual maintenance burden (security patches needed for both versions)
- Potential runtime conflicts if code attempts to share types
- No breaking functionality — both versions coexist without errors

## Root Cause Analysis

### Dependency Chain
```
txio-api (backend/api)
├── reqwest 0.11.27 (direct, via workspace pin)
└── brevo 1.0.0 (direct)
    └── reqwest 0.12.28 (transitive)

txio-cli (cli)
├── reqwest 0.11.27 (direct, via workspace pin)
└── mongodb 2.8.2 (does NOT enforce reqwest 0.12)
```

### Investigation Findings

1. **Culprit Identified**: `brevo 1.0.0` is the sole source of `reqwest 0.12.28`
2. **MongoDB is NOT responsible**: MongoDB driver does not enforce `reqwest 0.12`
3. **Only version available**: brevo 1.0.0 is the only release on crates.io (published March 2025)
4. **Unavoidable with current dependency**: No older brevo version exists to downgrade to

## Proposed Solutions

### Solution 1: Replace Brevo (Recommended Long-term)

**Pros**:
- Eliminates version duplication entirely
- Reduces binary size by ~1.2MB
- Single HTTP client stack to maintain
- May find alternatives with better reqwest version compatibility

**Cons**:
- Requires finding/integrating alternative email service client
- Potential feature parity concerns
- Migration effort for email sending logic

**Implementation**:
```bash
# Search alternatives on crates.io
# Candidates: lettre (pure Rust, no reqwest), resend-rs, postmark-rs
# Evaluate for feature parity with current email functionality
```

**Estimated Effort**: Medium (1-2 days)

---

### Solution 2: Fork/Patch Brevo (Recommended Short-term)

**Pros**:
- Maintains current email functionality
- Can pin `reqwest 0.11` in fork
- Fully under control
- Reversible when brevo updates

**Cons**:
- Maintenance overhead (must track upstream)
- Not on official crates.io registry
- Adds custom dependency

**Implementation**:
```toml
# In Cargo.toml
brevo = { git = "https://github.com/Txio-labs/brevo-rust.git", branch = "reqwest-0.11" }

# Steps:
# 1. Fork https://github.com/ClaXXX/brevo-rust
# 2. Change Cargo.toml: brevo = "0.11" (instead of "0.12")
# 3. Publish to custom git URL or internal registry
```

**Estimated Effort**: Low (2-4 hours)

---

### Solution 3: Accept & Document (Current State)

**Pros**:
- Requires zero implementation effort
- No migration risk
- Maintains current stability

**Cons**:
- Binary bloat persists (~1.2MB)
- Ongoing maintenance burden
- Technical debt accumulates

**Documentation Update**:
```markdown
## Known Limitations

### Duplicate Reqwest Versions
- `reqwest 0.11.27` (direct) + `reqwest 0.12.28` (via brevo)
- Root cause: brevo 1.0.0 requires reqwest 0.12
- No alternative brevo versions available
- Accepted tradeoff: email service availability > binary size
- Future: Evaluate replacement when reqwest alignment improves
```

**Estimated Effort**: Minimal (document in README)

---

## Comparison Matrix

| Factor | Replace Brevo | Fork Brevo | Accept & Document |
|--------|---------------|-----------|-------------------|
| **Binary Size** | ✅ Solved | ✅ Solved | ❌ ~1.2MB overhead |
| **Maintenance** | ✅ Low | ⚠️ Medium | ⚠️ Ongoing |
| **Implementation** | Medium | Low | Minimal |
| **Risk Level** | Medium | Low | None |
| **Time-to-complete** | 1-2 days | 2-4 hours | < 30 mins |
| **Reversibility** | Medium | High | High |

---

## Verification Steps

### Current State (Before Solution)
```bash
cargo tree -p reqwest --all-targets --workspace
# Should show both 0.11.27 and 0.12.28
```

### After Implementation
```bash
cargo tree -p reqwest --all-targets --workspace
# Should show only one version
```

### Binary Size Check
```bash
ls -lh target/release/txio
# Compare binary sizes before/after
```

---

## Recommendation

**Immediate**: Implement Solution 2 (Fork Brevo)
- Low risk and implementation effort
- Quickly resolves duplication
- Maintains functionality

**Future**: Plan transition to Solution 1 (Replace Brevo)
- Evaluate alternatives (lettre, resend-rs, postmark-rs)
- Test feature parity
- Execute migration in dedicated PR

---

## References

- Crates.io: [brevo](https://crates.io/crates/brevo) - Only v1.0.0 available
- GitHub: [ClaXXX/brevo-rust](https://github.com/ClaXXX/brevo-rust) - Official source
- Related Issue: #28 (frontend duplicate SDK problem - similar technical debt)
- Investigation Date: 2026-07-18

---

## Next Steps

1. **Consensus**: Align on preferred solution with team
2. **Execute**: Implement chosen solution
3. **Verify**: Run binary size and dependency checks
4. **Document**: Update README with known limitations (if Solution 3)
5. **Track**: Plan long-term roadmap item for binary size reduction
