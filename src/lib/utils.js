// src/lib/utils.js
export const htmlHeaders = () => ({ "content-type": "text/html; charset=utf-8" });
export const downloadHeaders = (name, mime) => ({
  "content-type": mime,
  "content-disposition": `attachment; filename="${name}"`
});
