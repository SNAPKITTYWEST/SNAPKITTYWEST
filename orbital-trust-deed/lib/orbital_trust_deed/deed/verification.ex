defmodule OrbitalTrustDeed.Deed.Verification do
  @moduledoc """
  Trust Deed verification for orbital telemetry feeds.

  Every satellite feed must pass all verification gates
  before it can generate a Trust Deed.

  Verification is non-recursive. No loops. No retries.
  Only gate-by-gate validation.
  """

  @type feed :: map()
  @type verification_result :: {:ok, map()} | {:error, atom()}

  @freshness_window Application.compile_env(
    :orbital_trust_deed, :freshness_window_seconds, 14_400
  )

  @trusted_sources [
    "CelesTrak",
    "NASA GIBS",
    "NOAA GOES-16",
    "NOAA GOES-17",
    "NOAA GOES-18",
    "N2YO"
  ]

  @doc """
  Full verification pipeline for a satellite feed.
  Returns {:ok, trust_deed} or {:error, reason}.

  Gates (in order):
    1. Source verification — source_name must be in trusted list
    2. Schema verification — required fields present
    3. Timestamp verification — not nil, valid DateTime
    4. Freshness verification — within freshness window
  """
  @spec verify(feed()) :: verification_result()
  def verify(feed) do
    with :ok <- verify_source(feed),
         :ok <- verify_schema(feed),
         :ok <- verify_timestamp(feed),
         :ok <- verify_freshness(feed) do
      {:ok, build_deed(feed)}
    end
  end

  # ── GATE 1: Source Verification ──────────────────────────────

  defp verify_source(%{source: source}) when source in @trusted_sources do
    :ok
  end

  defp verify_source(%{source: _}), do: {:error, :untrusted_source}
  defp verify_source(_), do: {:error, :missing_source}

  # ── GATE 2: Schema Verification ──────────────────────────────

  @required_fields [:source, :source_uri, :timestamp, :data_type, :trust_class]

  defp verify_schema(feed) do
    missing = Enum.filter(@required_fields, &(not Map.has_key?(feed, &1)))

    case missing do
      [] -> :ok
      fields -> {:error, {:missing_fields, fields}}
    end
  end

  # ── GATE 3: Timestamp Verification ───────────────────────────

  defp verify_timestamp(%{timestamp: %DateTime{}}), do: :ok
  defp verify_timestamp(%{timestamp: _}), do: {:error, :invalid_timestamp}
  defp verify_timestamp(_), do: {:error, :missing_timestamp}

  # ── GATE 4: Freshness Verification ───────────────────────────

  defp verify_freshness(%{timestamp: ts, latency_window: window}) do
    now = DateTime.utc_now()
    diff = DateTime.diff(now, ts, :second)

    if diff <= window do
      :ok
    else
      {:error, :telemetry_stale}
    end
  end

  defp verify_freshness(%{timestamp: ts}) do
    now = DateTime.utc_now()
    diff = DateTime.diff(now, ts, :second)

    if diff <= @freshness_window do
      :ok
    else
      {:error, :telemetry_stale}
    end
  end

  defp verify_freshness(_), do: {:error, :missing_timestamp}

  # ── Deed Construction ────────────────────────────────────────

  defp build_deed(feed) do
    now = DateTime.utc_now()

    deed = %{
      deed_id: generate_deed_id(feed),
      source: feed.source,
      source_uri: feed.source_uri,
      data_type: feed.data_type,
      trust_class: feed.trust_class,
      timestamp: feed.timestamp,
      verified_at: now,
      freshness: freshness_status(feed),
      verification_gates: [:source, :schema, :timestamp, :freshness],
      deed_hash: nil
    }

    %{deed | deed_hash: compute_hash(deed)}
  end

  defp generate_deed_id(feed) do
    input = "#{feed.source}:#{feed.source_uri}:#{DateTime.to_iso8601(feed.timestamp)}"
    :crypto.hash(:sha256, input) |> Base.encode16(case: :lower) |> binary_part(0, 16)
  end

  defp compute_hash(deed) do
    input = "#{deed.deed_id}:#{deed.source}:#{DateTime.to_iso8601(deed.verified_at)}"
    :crypto.hash(:sha256, input) |> Base.encode16(case: :lower)
  end

  defp freshness_status(%{timestamp: ts, latency_window: window}) do
    diff = DateTime.diff(DateTime.utc_now(), ts, :second)

    cond do
      diff <= div(window, 4) -> :fresh
      diff <= div(window, 2) -> :acceptable
      diff <= window -> :aging
      true -> :stale
    end
  end

  defp freshness_status(_), do: :unknown

  @doc """
  Checks if a feed can generate an allowed agent action.
  """
  @spec agent_action_allowed?(feed()) :: boolean()
  def agent_action_allowed?(feed) do
    case verify(feed) do
      {:ok, _deed} -> true
      {:error, _} -> false
    end
  end
end
