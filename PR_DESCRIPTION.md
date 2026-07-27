# Wire up "Forgot Password" flow on Sign In page

## Summary
The "Forgot?" link next to the password field on the Sign In page was previously a dead button. This PR wires it up to the existing client API methods (`forgotPassword` and `resetPassword`) via a new, seamless two-step flow inline within the Sign In page. 

Rather than redirecting the user to a completely separate page, the Sign In form transitions into:
1. An **Email Entry** step (to request the OTP).
2. An **OTP + New Password** step (reusing the exact 6-digit OTP UI pattern from `OTPPage.tsx`).

## Related Issues
- **Closes**: #290
- **Related**: #11 (Backend implementation counterpart)

## Changes
- **`SignInPage.tsx`**: 
  - Added new state to track `forgotPasswordStep`.
  - Copied the OTP input logic (refs, `handleChange`, `handleKeyDown`, `handlePaste`) from `OTPPage.tsx` for consistent behavior.
  - Wired submit handlers for both the email and the OTP/password steps using `apiService`.
  - Handled loading states and integrated with `appStore.showToast` to display inline successes/errors.

## Verification Steps
1. Checkout the branch and run `npm run dev`.
2. Navigate to the Sign In page.
3. Click the "Forgot?" button (next to the password label).
4. Verify the form transitions to the Email entry view.
5. Enter a valid email and click "Send Code". 
6. Upon success, verify the form transitions to the OTP entry view.
7. Enter a 6-digit code, a new password, and confirm password. Verify client-side validations (passwords match, >= 8 chars).
8. Click "Reset Password" and ensure you receive a success toast and are returned to the default Sign In form.

## Checks
- [x] Build passes (`tsc --noEmit`)
- [x] Linter passes
- [x] Tested manually locally
