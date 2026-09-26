/**
 * Resolves full URL for backend-hosted storage assets (e.g. blog featured images).
 * If the URL is already an absolute URL (http/https/data:), it returns it as-is.
 * Otherwise, it prepends the backend API base URL.
 */
export const getBlogImageUrl = (imagePath, fallback = "") => {
  if (!imagePath) return fallback;

  const pathStr = String(imagePath).trim().replace(/\\/g, "/");

  // If already absolute or base64 blob
  if (
    pathStr.startsWith("http://") ||
    pathStr.startsWith("https://") ||
    pathStr.startsWith("data:") ||
    pathStr.startsWith("blob:")
  ) {
    return pathStr;
  }

  const apiBase = (process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test").replace(/\/+$/, "");
  const formattedPath = pathStr.startsWith("/") ? pathStr : `/${pathStr}`;
  return `${apiBase}${formattedPath}`;
};

/**
 * Normalizes relative /storage/... URLs inside rich HTML content (e.g. Quill body)
 * so <img>, <video>, <audio>, and <source> elements load from the backend instead of 404ing on localhost:3000.
 */
export const normalizeRichMediaHtml = (html) => {
  if (!html || typeof html !== "string") return "";

  const apiBase = (process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test").replace(/\/+$/, "");

  return html.replace(
    /(<(?:img|source|video|audio)[^>]*\s+src=["'])(?:\/)?storage\/([^"']+)(["'])/gi,
    (match, prefix, path, suffix) => `${prefix}${apiBase}/storage/${path}${suffix}`
  );
};

