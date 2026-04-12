export function getAttachmentKind(url: string): "image" | "pdf" | "link" {
  // PDF check must come before the /image/upload/ check — Cloudinary serves
  // PDFs under the /image/upload/ path when resource_type is "auto", so the
  // file extension is the reliable discriminator.
  if (url.includes("/raw/upload/") || /\.pdf(\?|#|$)/i.test(url)) return "pdf";
  if (url.includes("/image/upload/")) return "image";
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|#|$)/.test(lower)) return "image";
  return "link";
}
