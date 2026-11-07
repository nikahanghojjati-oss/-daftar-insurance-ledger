// Public web-app configuration, never a service-account key or a password.
export const FIREBASE = Object.freeze({
  apiKey: 'AIzaSyCLCYNqVpYVtf1vSIUuvAU9Nh7-U7uWo4s',
  authDomain: 'daftar-insurance-ledger.firebaseapp.com',
  projectId: 'daftar-insurance-ledger',
  appId: '1:347296833755:web:13be7cca53193ec5e4acfe'
});
export const LEDGER_UID = 'i6VYpbhc1Iaf0qNjILLRnwhvISR2';
// Authentication identities share the existing ledger path; a login UID
// must never become a new ledger ID or move an existing device's records.
export const LEDGER_AUTH_UIDS = Object.freeze([
  LEDGER_UID,
  'OrAHVtSfEGXWBSqswGdr74O3CO62'
]);

