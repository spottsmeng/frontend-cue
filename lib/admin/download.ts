/**
 * `/admin/export/{project_id}` and `/admin/consent/export` are real
 * FastAPI `Response`/`JSONResponse` bodies behind `require_org_administrator`
 * — unlike Living WIP's Freeze & Export (a signed, expiring MinIO URL a
 * plain `<a href>` can hit directly, no Authorization header needed), these
 * need the caller's own bearer token, so a real fetch through the
 * authenticated API client is required; a bare link would 401. This client-
 * side helper turns an already-fetched `Blob` into a real browser download
 * without navigating away from the admin screen.
 */
export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
