# Password verification fix for update-user-password

## Summary

The password update flow now verifies the submitted current password before changing the account password.

## What changed

- Updated the auth service password update path to call bcrypt verification against the stored password hash before persisting a new password.
- Passed the current password from the handler into the service so the endpoint uses the DTO field that was previously ignored.
- Added regression tests covering both rejected mismatches and accepted matching passwords.

## Result

Requests that provide an incorrect current password are rejected with an unauthorized error, preventing password changes without proof of the existing password.
