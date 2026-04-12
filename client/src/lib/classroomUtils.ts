export function getAttachmentKind(url: string): "image" | "pdf" | "link" {
  if (url.includes("/image/upload/")) return "image";
  if (url.includes("/raw/upload/") || /\.pdf(\?|$)/i.test(url)) return "pdf";
  const lower = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/.test(lower)) return "image";
  return "link";
}
