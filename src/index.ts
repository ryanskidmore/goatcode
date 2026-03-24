import type { Plugin } from "@opencode-ai/plugin"
import { bootstrap } from "./bootstrap"

const GoatCodePlugin: Plugin = (ctx) => bootstrap(ctx)

export default GoatCodePlugin
export { definePlugin } from "./plugin-api"
export { defineConfig, defineConfigAsync } from "./config"
