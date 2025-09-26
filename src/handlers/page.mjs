// src/handlers/page.mjs
import { htmlHeaders } from "../lib/utils.js";
import INDEX from "../../public/index.html?raw"; // if using Wrangler bundling
export default async () => new Response(INDEX, { headers: htmlHeaders() });
