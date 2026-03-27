function getBaseUrl(): string {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
  }
  return 'http://localhost:5000';
}

export function primaryButton(label: string, url: string): string {
  return `
<table cellpadding="0" cellspacing="0" border="0" style="margin:32px auto;">
  <tr>
    <td align="center" style="border-radius:6px;background:#1E8C64;">
      <a href="${url}"
         target="_blank"
         style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

export function buildEmailHtml(bodyHtml: string, options: { preheader?: string } = {}): string {
  const logoUrl = `${getBaseUrl()}/logo-sidebar.webp`;
  const year = new Date().getFullYear();
  const preheader = options.preheader ?? '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Lyra Preparatory</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <!-- preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;color:#f0f4f2;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <!-- outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07);">

          <!-- ── HEADER ── -->
          <tr>
            <td align="center" style="background:#1E8C64;padding:32px 40px 28px;">
              <img src="${logoUrl}" alt="Lyra Preparatory" width="52" height="52"
                   style="display:block;border:0;border-radius:8px;margin:0 auto 12px;" />
              <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.3px;line-height:1;">
                Lyra Preparatory
              </div>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="padding:40px 48px 32px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#f8faf9;border-top:1px solid #e8efeb;padding:24px 48px;text-align:center;">
              <p style="margin:0 0 6px;color:#9bb09f;font-size:12px;line-height:1.5;">
                &copy; ${year} Lyra Preparatory &middot; All rights reserved
              </p>
              <p style="margin:0;color:#b8c8bb;font-size:11px;line-height:1.5;">
                If you didn&rsquo;t request this email, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
        <!-- /card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}
