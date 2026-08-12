if (
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  !window.location.hostname.endsWith(".replit.app") &&
  !window.location.hostname.endsWith(".replit.dev") &&
  window.location.hostname !== "www.lyraprep.com"
) {
  const s = document.createElement("script");
  s.src = "https://replit.com/public/js/replit-dev-banner.js";
  document.body.appendChild(s);
}
