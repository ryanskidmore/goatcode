import type { Plugin } from "@opencode-ai/plugin"
import { bootstrap } from "./bootstrap"

const OcHeadPlugin: Plugin = (ctx) => bootstrap(ctx)

export default OcHeadPlugin
export { definePlugin } from "./plugin-api"
export { defineConfig, defineConfigAsync } from "./config"
