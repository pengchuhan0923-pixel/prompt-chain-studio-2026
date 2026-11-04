import "server-only";

const authorizedEmails = new Set([
  "pengchuhan0923@gmail.com",
  "et2921@columbia.edu",
]);

export function isAuthorizedSuperadminEmail(email: string | null | undefined) {
  return email ? authorizedEmails.has(email.trim().toLowerCase()) : false;
}
