# CI/CD Refactoring Plan for SyncHire

## User Requirements
1. Remove Kubernetes deployment workflow (inappropriate for lightweight tool)
2. Fix ALL failing frontend and backend tests
3. Add GitHub Actions workflow for packaging Windows exe and Linux apk
4. Ensure ALL CI/CD validations genuinely pass (no fake/non-blocking tests)
5. No AI hallucinations - all solutions must be verified

## Current Issues Identified

### Backend Test Failures
- **File**: `/home/re/code/SyncHire/api/app/api/oauth.py:230`
- **Issue**: `current_user_id: str = Depends(...)` - Ellipsis is not a valid dependency
- **Error**: `TypeError: Ellipsis is not a callable object`
- **Root Cause**: Placeholder dependency was never implemented

### Frontend Test Failures
- **Files**: Multiple test files
- **Issues**:
  1. WebSocket client tests missing QueryClientProvider wrapper (28 failed tests)
  2. Error handling integration tests failing
  3. use-websocket tests have infinite loop issues
- **Summary**: 28 failed, 292 passed (320 total)

### Deploy Workflow Issues
- **File**: `.github/workflows/deploy.yml`
- **Issue**: Uses Kubernetes and requires secrets
- **Problem**: Not appropriate for lightweight desktop tool

## Implementation Plan

### Phase 1: Fix Backend Test (BLOCKING)

**Work Unit 1.1**: Fix OAuth API ellipsis dependency
- **File**: `/home/re/code/SyncHire/api/app/api/oauth.py`
- **Action**: Replace `Depends(...)` with proper authentication dependency
- **Solution**: Comment out the endpoint or implement proper `get_current_user` dependency
- **Verification**: Backend tests pass locally

### Phase 2: Fix Frontend Tests (BLOCKING)

**Work Unit 2.1**: Add QueryClientProvider to WebSocket client tests
- **File**: `/home/re/code/SyncHire/frontend/src/lib/__tests__/websocket-client.test.ts`
- **Action**: Wrap test components with QueryClientProvider
- **Verification**: WebSocket tests pass

**Work Unit 2.2**: Fix error handling integration tests
- **File**: `/home/re/code/SyncHire/frontend/src/lib/__tests__/error-handling-integration.test.tsx`
- **Action**: Fix broken assertions and missing QueryClientProvider
- **Verification**: Error handling tests pass

**Work Unit 2.3**: Fix use-websocket hook tests
- **File**: `/home/re/code/SyncHire/frontend/src/hooks/__tests__/use-websocket.test.ts`
- **Action**: Fix infinite loop issues by using vi.useFakeTimers()
- **Verification**: WebSocket hook tests pass

### Phase 3: Remove Kubernetes Deploy Workflow

**Work Unit 3.1**: Delete deploy.yml
- **File**: `.github/workflows/deploy.yml`
- **Action**: Delete the file (uses Kubernetes, inappropriate for lightweight tool)
- **Verification**: File no longer exists

**Work Unit 3.2**: Update test.yml to remove non-blocking test steps
- **File**: `.github/workflows/test.yml`
- **Action**: Ensure all tests must pass (no `|| true` or `continue-on-error`)
- **Verification**: Test workflow fails on test failures

**Work Unit 3.3**: Update ci.yml to require all tests to pass
- **File**: `.github/workflows/ci.yml`
- **Action**: Remove `continue-on-error` from test steps
- **Verification**: CI workflow fails on test failures

### Phase 4: Add Packaging Workflows

**Work Unit 4.1**: Create Windows exe packaging workflow
- **File**: `.github/workflows/package-windows.yml`
- **Content**: GitHub Actions workflow using:
  - Electron Builder for Windows exe
  - NSIS for installer
  - Code signing (optional)
- **Trigger**: On push to main tag
- **Artifact**: Windows exe installer

**Work Unit 4.2**: Create Linux app/deb packaging workflow
- **File**: `.github/workflows/package-linux.yml`
- **Content**: GitHub Actions workflow using:
  - Electron Builder for Linux
  - AppImage and deb package generation
- **Trigger**: On push to main tag
- **Artifact**: Linux AppImage and deb packages

### Phase 5: Verify All CI/CD Passes

**Work Unit 5.1**: Run full local validation
- **Actions**:
  1. `npm run type-check` - must pass
  2. `npm run lint` - must pass
  3. `npm run build` - must pass
  4. `npm run test --workspace=frontend` - must pass
  5. Backend pytest tests - must pass
- **Verification**: All checks pass

**Work Unit 5.2**: Push and verify remote CI/CD
- **Actions**:
  1. Push changes to GitHub
  2. Wait for CI workflow to complete
  3. Wait for test workflow to complete
- **Verification**: Both workflows pass

## Dependencies

### File Dependencies
- `oauth.py` depends on: `get_current_user` dependency implementation
- `websocket-client.test.ts` depends on: React Query providers
- `error-handling-integration.test.tsx` depends on: Error handling utilities
- `use-websocket.test.ts` depends on: WebSocket mock utilities

### Work Unit Ordering
1. Phase 1 (Backend fix) must complete before Phase 2
2. Phase 2 (Frontend fixes) can run in parallel for each test file
3. Phase 3 (Remove K8s) depends on Phase 1 and 2 completing
4. Phase 4 (Packaging) can run independently
5. Phase 5 (Verification) depends on all previous phases

## Verification Steps

Each Work Unit has defined verification:

**WU 1.1**: Backend pytest passes
**WU 2.1**: WebSocket tests pass
**WU 2.2**: Error handling tests pass
**WU 2.3**: use-websocket tests pass
**WU 3.1**: File deleted
**WU 3.2**: Test workflow fails on bad tests
**WU 3.3**: CI workflow fails on bad tests
**WU 4.1**: Windows workflow generates exe
**WU 4.2**: Linux workflow generates packages
**WU 5.1**: All local checks pass
**WU 5.2**: Remote CI/CD passes

## Edge Cases Considered

1. **If `get_current_user` doesn't exist**: Comment out the endpoint for now
2. **If QueryClient setup is complex**: Create a test utility wrapper
3. **If Electron packaging fails**: Add fallback to standard Node.js packaging
4. **If tests timeout**: Increase timeout or fix infinite loops

## Rollback Plan

If any change breaks existing functionality:
1. Revert the specific commit
2. Fix the issue in a new branch
3. Re-run tests before merging

## Cross-File Integration Points

- `main.py` imports from `app.api.oauth` - ensure imports work after fix
- Test files import from `src/lib/*` - ensure no circular dependencies
- CI workflows reference each other - ensure no broken references
