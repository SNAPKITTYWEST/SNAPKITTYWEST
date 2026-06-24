defmodule OrbitalTrustDeedWeb.DashboardLive do
  @moduledoc """
  Orbital Trust Deed Dashboard — LiveView spine.

  Real-time satellite visualization with three planes:
    VISUAL: Earth imagery, orbit path, satellite marker
    SIGNAL: TLE age, latency, source health, freshness
    GOVERNANCE: Trust Deed, WORM seal, agent action gate

  No blind feed. No stale telemetry. Only verified orbital state.
  """

  use OrbitalTrustDeedWeb, :live_view

  alias OrbitalTrustDeed.Sources.{CelesTrak, NasaGibs, NoaaGoes, N2yo}
  alias OrbitalTrustDeed.Deed.Verification
  alias OrbitalTrustDeed.Worm.Chain

  @refresh_interval 30_000  # 30 seconds for N2YO rate limits (100/day)

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      :timer.send_interval(@refresh_interval, self(), :refresh)
    end

    socket = socket
    |> assign(:satellites, [])
    |> assign(:selected_satellite, nil)
    |> assign(:gibs_layers, NasaGibs.available_layers())
    |> assign(:selected_layer, "MODIS_Terra_CorrectedReflectance_TrueColor")
    |> assign(:visual_plane, %{earth: true, orbit: true, weather: false})
    |> assign(:signal_plane, %{source_health: :unknown, freshness: :unknown})
    |> assign(:governance_plane, %{deed: nil, worm_seal: nil, agent_action: :blocked})
    |> assign(:chain_stats, %{chain_length: 0})
    |> assign(:pass_predictions, [])
    |> assign(:now, DateTime.utc_now())
    |> load_satellites()

    {:ok, socket}
  end

  @impl true
  def handle_info(:refresh, socket) do
    socket = socket
    |> assign(:now, DateTime.utc_now())
    |> refresh_signal_plane()
    |> refresh_governance()

    {:noreply, socket}
  end

  @impl true
  def handle_event("select_satellite", %{"id" => norad_id}, socket) do
    case CelesTrak.fetch_tle(norad_id) do
      {:ok, feed} ->
        # Also fetch real-time N2YO position and pass predictions
        n2yo_pos = N2yo.get_position(norad_id)
        passes = N2yo.get_passes(norad_id, 40.0, -74.0, 7) # NYC default, 7 days

        socket = socket
        |> assign(:selected_satellite, Map.put(feed, :n2yo_position, n2yo_pos))
        |> assign(:pass_predictions, case passes do
          {:ok, p} -> p
          _ -> []
        end)

        case Verification.verify(feed) do
          {:ok, deed} ->
            Chain.seal(deed)

            socket = socket
            |> assign(:governance_plane, %{
              deed: deed,
              worm_seal: Chain.tip(),
              agent_action: :allowed
            })
            |> assign(:signal_plane, %{
              source_health: :verified,
              freshness: deed.freshness,
              latency: feed[:latency_window],
              source_uri: feed.source_uri,
              timestamp: feed.timestamp,
              n2yo_position: n2yo_pos
            })

            {:noreply, socket}

          {:error, reason} ->
            socket = socket
            |> assign(:governance_plane, %{
              deed: nil,
              worm_seal: nil,
              agent_action: :blocked,
              block_reason: reason
            })

            {:noreply, socket}
        end

      {:error, reason} ->
        {:noreply, put_flash(socket, :error, "Failed to fetch TLE: #{inspect(reason)}")}
    end
  end

  @impl true
  def handle_event("select_layer", %{"layer" => layer}, socket) do
    {:noreply, assign(socket, :selected_layer, layer)}
  end

  @impl true
  def handle_event("toggle_visual", %{"feature" => feature}, socket) do
    visual = socket.assigns.visual_plane
    feature = String.to_existing_atom(feature)
    {:noreply, assign(socket, :visual_plane, Map.update!(visual, feature, &(!&1)))}
  end

  def render(assigns) do
    ~H"""
    <div class="orbital-dashboard">
      <header class="dashboard-header">
        <div class="header-title">
          <span class="seal-icon">🛰️</span>
          <h1>ORBITAL TRUST DEED DASHBOARD Ω</h1>
          <span class="subtitle">EDGE-TO-ORBITAL · NON-RECURSIVE TELEMETRY LAYER</span>
        </div>
        <div class="header-status">
          <span class="status-dot {status_class(@chain_stats.verified)}"></span>
          WORM CHAIN: <%= @chain_stats.chain_length %> seals
        </div>
      </header>

      <main class="dashboard-body">
        <%!-- VISUAL PLANE --%>
        <section class="plane visual-plane">
          <h2>◉ VISUAL PLANE</h2>
          <div class="earth-container" id="earth-view"
               phx-hook="EarthView"
               data-layer={@selected_layer}
               data-lat={sat_lat(@selected_satellite)}
               data-lon={sat_lon(@selected_satellite)}
               data-alt={sat_alt(@selected_satellite)}>
          </div>
          <div class="n2yo-position">
            <%= format_n2yo(@selected_satellite && @selected_satellite[:n2yo_position]) %>
          </div>
          <div class="visual-controls">
            <label><input type="checkbox" checked={@visual_plane.earth} phx-click="toggle_visual" phx-value-feature="earth"> Earth</label>
            <label><input type="checkbox" checked={@visual_plane.orbit} phx-click="toggle_visual" phx-value-feature="orbit"> Orbit</label>
            <label><input type="checkbox" checked={@visual_plane.weather} phx-click="toggle_visual" phx-value-feature="weather"> Weather</label>
          </div>
        </section>

        <%!-- SIGNAL PLANE --%>
        <section class="plane signal-plane">
          <h2>◎ SIGNAL PLANE</h2>
          <div class="signal-grid">
            <div class="signal-card">
              <span class="label">Source</span>
              <span class="value"><%= @selected_satellite && @selected_satellite.source || "—" %></span>
            </div>
            <div class="signal-card">
              <span class="label">TLE Age</span>
              <span class="value freshness-<%= @signal_plane.freshness %>">
                <%= format_age(@signal_plane.timestamp) %>
              </span>
            </div>
            <div class="signal-card">
              <span class="label">Latency</span>
              <span class="value"><%= format_latency(@signal_plane.latency) %></span>
            </div>
            <div class="signal-card">
              <span class="label">Source Health</span>
              <span class="value health-<%= @signal_plane.source_health %>">
                <%= @signal_plane.source_health %>
              </span>
            </div>
          </div>

          <%= if @selected_satellite && @selected_satellite[:n2yo_position] do %>
            <div class="n2yo-grid">
              <div class="signal-card n2yo-live">
                <span class="label">N2YO LAT</span>
                <span class="value"><%= format_n2yo_lat(@selected_satellite[:n2yo_position]) %></span>
              </div>
              <div class="signal-card n2yo-live">
                <span class="label">N2YO LON</span>
                <span class="value"><%= format_n2yo_lon(@selected_satellite[:n2yo_position]) %></span>
              </div>
              <div class="signal-card n2yo-live">
                <span class="label">N2YO ALT</span>
                <span class="value"><%= format_n2yo_alt(@selected_satellite[:n2yo_position]) %></span>
              </div>
            </div>
          <% end %>

          <div class="freshness-meter">
            <div class="meter-bar" style={"width: #{freshness_percent(@signal_plane.freshness)}%"}></div>
          </div>
        </section>

        <%!-- GOVERNANCE PLANE --%>
        <section class="plane governance-plane">
          <h2>⬡ GOVERNANCE PLANE</h2>
          <%= if @governance_plane.deed do %>
            <div class="deed-card verified">
              <h3>TRUST DEED VERIFIED</h3>
              <div class="deed-fields">
                <div><span class="label">Deed ID:</span> <code><%= @governance_plane.deed.deed_id %></code></div>
                <div><span class="label">Source:</span> <%= @governance_plane.deed.source %></div>
                <div><span class="label">Verified:</span> <%= format_time(@governance_plane.deed.verified_at) %></div>
                <div><span class="label">Hash:</span> <code class="hash"><%= String.slice(@governance_plane.deed.deed_hash, 0, 16) %>…</code></div>
              </div>
            </div>
          <% else %>
            <div class="deed-card pending">
              <h3>NO DEED</h3>
              <p>Select a verified satellite feed to generate a Trust Deed.</p>
            </div>
          <% end %>

          <%= if @governance_plane.worm_seal do %>
            <div class="worm-card sealed">
              <h3>WORM CHAIN SEALED</h3>
              <div class="deed-fields">
                <div><span class="label">Chain Index:</span> #<%= @governance_plane.worm_seal.index %></div>
                <div><span class="label">Prev Hash:</span> <code><%= String.slice(@governance_plane.worm_seal.prev_hash, 0, 16) %>…</code></div>
                <div><span class="label">Seal Hash:</span> <code><%= String.slice(@governance_plane.worm_seal.seal_hash, 0, 16) %>…</code></div>
                <div><span class="label">Sealed At:</span> <%= format_time(@governance_plane.worm_seal.sealed_at) %></div>
              </div>
            </div>
          <% end %>

          <%= if @pass_predictions != [] do %>
            <div class="pass-predictions">
              <h3>PASS PREDICTIONS (7 days)</h3>
              <div class="pass-list">
                <%= for pass <- Enum.take(@pass_predictions, 5) do %>
                  <div class="pass-item">
                    <span class="pass-time"><%= format_time(pass.start) %></span>
                    <span class="pass-duration"><%= pass.duration_minutes %>m</span>
                    <span class="pass-elevation">max <%= pass.max_elevation %>°</span>
                  </div>
                <% end %>
              </div>
            </div>
          <% end %>

          <div class="agent-gate">
            <h3>AGENT ACTION GATE</h3>
            <%= if @governance_plane.agent_action == :allowed do %>
              <div class="gate-allowed">
                <span class="gate-icon">✓</span>
                AGENT ACTION ALLOWED
              </div>
            <% else %>
              <div class="gate-blocked">
                <span class="gate-icon">✗</span>
                AGENT ACTION BLOCKED
                <%= if @governance_plane.block_reason do %>
                  <div class="block-reason">REASON: <%= format_block_reason(@governance_plane.block_reason) %></div>
                <% end %>
              </div>
            <% end %>
          </div>
        </section>
      </main>

      <%!-- SATELLITE SELECTOR --%>
      <aside class="satellite-selector">
        <h2>SATELLITES</h2>
        <div class="sat-list">
          <%= for sat <- @satellites do %>
            <button class={"sat-item #{if @selected_satellite && @selected_satellite.norad_id == sat.norad_id, do: "selected"}"}
                    phx-click="select_satellite"
                    phx-value-id={sat.norad_id}>
              <span class="sat-name"><%= sat.name %></span>
              <span class="sat-id">NORAD <%= sat.norad_id %></span>
            </button>
          <% end %>
        </div>
      </aside>

      <footer class="dashboard-footer">
        <span>☉⌹○◇△⬡🛰️Ω</span>
        <span>ORBITAL TRUST DEED VERIFIED</span>
        <span>WORM SEALED · NON-RECURSIVE · SOVEREIGN</span>
      </footer>
    </div>
    """
  end

  # ── Helpers ──────────────────────────────────────────────────

  defp load_satellites(socket) do
    # Well-known satellites for the dashboard
    known = [
      %{norad_id: "25544", name: "ISS (ZARYA)"},
      %{norad_id: "48274", name: "TIANGONG"},
      %{norad_id: "28654", name: "NOAA-19"},
      %{norad_id: "33591", name: "NOAA-20"},
      %{norad_id: "43013", name: "NOAA-21"},
      %{norad_id: "40014", name: "GOES-16"},
      %{norad_id: "41888", name: "GOES-17"},
      %{norad_id: "49074", name: "GOES-18"},
      %{norad_id: "20580", name: "HUBBLE"},
      %{norad_id: "43205", name: "STARLINK-1007"}
    ]

    assign(socket, :satellites, known)
  end

  defp refresh_signal_plane(socket) do
    assign(socket, :now, DateTime.utc_now())
  end

  defp refresh_governance(socket) do
    assign(socket, :chain_stats, Chain.stats())
  end

  defp sat_lat(%{n2yo_position: {:ok, %{satlatitude: lat}}}) when is_float(lat), do: lat
  defp sat_lat(%{tle_line2: line2}) do
    line2 |> String.slice(8, 7) |> String.trim() |> Float.parse() |> elem(0)
  rescue
    _ -> 0.0
  end

  defp sat_lat(_), do: 0.0

  defp sat_lon(%{n2yo_position: {:ok, %{satlongitude: lon}}}) when is_float(lon), do: lon
  defp sat_lon(%{tle_line2: line2}) do
    line2 |> String.slice(17, 7) |> String.trim() |> Float.parse() |> elem(0)
  rescue
    _ -> 0.0
  end

  defp sat_lon(_), do: 0.0

  defp sat_alt(%{n2yo_position: {:ok, %{sataltitude: alt}}}) when is_float(alt), do: alt
  defp sat_alt(_), do: 408.0

  defp format_n2yo({:ok, %{satlatitude: lat, satlongitude: lon, sataltitude: alt}}) do
    "LAT #{Float.round(lat, 4)}° LON #{Float.round(lon, 4)}° ALT #{Float.round(alt, 1)}km"
  end
  defp format_n2yo({:error, :no_api_key}), do: "N2YO: No API key"
  defp format_n2yo({:error, :rate_limit_exceeded}), do: "N2YO: Rate limited"
  defp format_n2yo({:error, _}), do: "N2YO: Offline"
  defp format_n2yo(_), do: "N2YO: Waiting..."

  defp format_n2yo_lat({:ok, %{satlatitude: lat}}) when is_float(lat), do: "#{Float.round(lat, 4)}°"
  defp format_n2yo_lat(_), do: "—"

  defp format_n2yo_lon({:ok, %{satlongitude: lon}}) when is_float(lon), do: "#{Float.round(lon, 4)}°"
  defp format_n2yo_lon(_), do: "—"

  defp format_n2yo_alt({:ok, %{sataltitude: alt}}) when is_float(alt), do: "#{Float.round(alt, 1)}km"
  defp format_n2yo_alt(_), do: "—"

  defp format_age(nil), do: "—"
  defp format_age(%DateTime{} = ts) do
    diff = DateTime.diff(DateTime.utc_now(), ts, :minute)
    cond do
      diff < 60 -> "#{diff}m"
      diff < 1440 -> "#{div(diff, 60)}h #{rem(diff, 60)}m"
      true -> "#{div(diff, 1440)}d"
    end
  end

  defp format_latency(nil), do: "—"
  defp format_latency(secs) when secs < 60, do: "#{secs}s"
  defp format_latency(secs) when secs < 3600, do: "#{div(secs, 60)}m"
  defp format_latency(secs), do: "#{div(secs, 3600)}h"

  defp format_time(nil), do: "—"
  defp format_time(%DateTime{} = dt), do: Calendar.strftime(dt, "%Y-%m-%d %H:%M:%S UTC")

  defp format_block_reason(:untrusted_source), do: "UNTRUSTED ORBITAL TELEMETRY"
  defp format_block_reason(:telemetry_stale), do: "STALE ORBITAL TELEMETRY"
  defp format_block_reason(:missing_fields), do: "INCOMPLETE FEED SCHEMA"
  defp format_block_reason(reason), do: inspect(reason)

  defp freshness_percent(:fresh), do: 100
  defp freshness_percent(:acceptable), do: 75
  defp freshness_percent(:aging), do: 40
  defp freshness_percent(:stale), do: 10
  defp freshness_percent(_), do: 0

  defp status_class(true), do: "verified"
  defp status_class(_), do: "unknown"
end
