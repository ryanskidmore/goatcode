// IMPORTANT: No bun:* imports — this file runs under Node.js via npx promptfoo eval

export default class SpikeProvider {
  id() {
    return "goatcode-spike-provider";
  }

  async callApi(prompt: string) {
    return {
      output: `Spike response for: ${prompt}`,
      tokenUsage: { total: 10, prompt: 5, completion: 5 },
      cost: 0,
    };
  }
}
