#!/usr/bin/env node
const ua = process.env.npm_config_user_agent || "";
if (!ua.includes("pnpm")) {
  console.warn("[door-in-four] Recommended package manager is pnpm. See README for fallback install commands.");
}
