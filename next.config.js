/**
 * next.config.js
 * Ignore large or temporary folders during Next's output file tracing so
 * micromatch doesn't attempt to build very large patterns on the Vercel build host.
 */
/** @type {import('next').NextConfig} */
// Keep next.config minimal to avoid invalid experimental config on Vercel.
module.exports = {};
