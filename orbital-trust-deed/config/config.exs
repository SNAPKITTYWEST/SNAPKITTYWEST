import Config

config :orbital_trust_deed,
  n2yo_api_key: "ZTCRD6-7AEXLT-D9L7QV-5S70",
  freshness_window_seconds: 14_400,
  worm_chain_persist: true,
  worm_chain_path: "priv/worm/chain.jsonl"

config :logger, level: :info
