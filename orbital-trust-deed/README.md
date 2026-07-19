# Orbital Trust Deed

Edge-to-orbital trust surface for SnapKitty mesh governance.

This project verifies public orbital telemetry feeds, turns verified telemetry into
Trust Deeds, and seals those deeds into an append-only WORM chain.

## Current Source Modules

```text
lib/orbital_trust_deed/sources/celes_trak.ex      CelesTrak TLE fetcher
lib/orbital_trust_deed/sources/nasa_gibs.ex       NASA GIBS WMTS URL builder
lib/orbital_trust_deed/sources/noaa_goes.ex       NOAA GOES ABI imagery URL builder
lib/orbital_trust_deed/deed/verification.ex       Four-gate deed verifier
lib/orbital_trust_deed/worm/chain.ex              Append-only SHA-256 WORM chain
lib/orbital_trust_deed_web/live/dashboard_live.ex Phoenix LiveView dashboard
priv/static/css/orbital.css                       Dark sovereign dashboard UI
priv/static/js/earth_view.js                      CesiumJS Earth view hook
docs/index.html                                   GitHub Pages mesh front page
docs/mesh.json                                    Mesh manifest
```

## Mesh Contract

The orbital node does not execute agent actions directly. It emits verified
telemetry deeds and WORM receipts. The SnapKitty mesh decides whether an agent
action is allowed.

```text
Telemetry source
  -> 4-gate verification
  -> Trust Deed
  -> WORM seal
  -> mesh manifest / event
  -> agent action gate
```

## Phoenix Runtime Path

To turn this file drop into a runnable Phoenix app:

```bash
mix phx.new orbital_trust_deed
```

Then copy the existing `lib/` and `priv/` files into the generated project and
add:

```elixir
{:httpoison, "~> 2.0"},
{:jason, "~> 1.4"}
```

The static Pages front page is already shippable without Phoenix.
