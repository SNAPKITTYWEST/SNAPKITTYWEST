defmodule OrbitalTrustDeed.Sources.CelesTrak do
  @moduledoc """
  CelesTrak TLE data ingestion.
  Fetches current orbital element sets from celestrak.org.
  No API key required for public TLE data.
  """

  require Logger

  @base_url "https://celestrak.org/NORAD/elements"
  @supplemental_url "https://celestrak.org/NORAD/elements/supplemental/sup-gp.php"
  @freshness_window_seconds 3600 * 4  # 4 hours

  # NOTE: CelesTrak is free (501c3 nonprofit), no API key required.
  # CRITICAL: Do NOT poll more than once per 2 hours — they WILL block your IP.
  # Legacy .txt files removed Dec 2024. Use GP query endpoints instead.
  # 5-digit catalog numbers running out ~July 2026 at 69999.

  @spec fetch_tle(String.t()) :: {:ok, map()} | {:error, term()}
  def fetch_tle(norad_id) do
    # Use supplemental GP endpoint (recommended by CelesTrak)
    url = "#{@supplemental_url}?CATNR=#{norad_id}&FORMAT=tle"
    headers = [{"User-Agent", "SnapKittyOrbital/1.0"}]

    case HTTPoison.get(url, headers, timeout: 10_000) do
      {:ok, %{status_code: 200, body: body}} ->
        parse_tle(body, norad_id)

      {:ok, %{status_code: status}} ->
        {:error, {:http_error, status}}

      {:error, reason} ->
        {:error, {:network_error, reason}}
    end
  end

  @spec fetch_group(String.t()) :: {:ok, [map()]} | {:error, term()}
  def fetch_group(group_name) do
    # Use GP JSON endpoint (recommended by CelesTrak)
    url = "#{@base_url}/gp.php?GROUP=#{group_name}&FORMAT=json"
    headers = [{"User-Agent", "SnapKittyOrbital/1.0"}]

    case HTTPoison.get(url, headers, timeout: 15_000) do
      {:ok, %{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, satellites} -> {:ok, Enum.map(satellites, &parse_gp_json/1)}
          {:error, reason} -> {:error, {:parse_error, reason}}
        end

      {:ok, %{status_code: status}} ->
        {:error, {:http_error, status}}

      {:error, reason} ->
        {:error, {:network_error, reason}}
    end
  end

  defp parse_tle(body, norad_id) do
    lines = body |> String.trim() |> String.split("\n") |> Enum.map(&String.trim/1)

    case lines do
      [name, line1, line2] ->
        {:ok, %{
          source: "CelesTrak",
          source_uri: "#{@supplemental_url}?CATNR=#{norad_id}&FORMAT=tle",
          name: name,
          norad_id: norad_id,
          tle_line1: line1,
          tle_line2: line2,
          timestamp: DateTime.utc_now(),
          data_type: :tle,
          latency_window: @freshness_window_seconds,
          trust_class: :public
        }}

      _ ->
        {:error, :invalid_tle_format}
    end
  end

  defp parse_gp_json(%{
    "NORAD_CAT_ID" => norad_id,
    "OBJECT_NAME" => name,
    "TLE_LINE1" => line1,
    "TLE_LINE2" => line2,
    "EPOCH" => epoch
  }) do
    {:ok, ts, _} = DateTime.from_iso8601(epoch <> "Z")

    %{
      source: "CelesTrak",
      source_uri: "https://celestrak.org/NORAD/elements/gp.php?NORAD=#{norad_id}",
      name: name,
      norad_id: to_string(norad_id),
      tle_line1: line1,
      tle_line2: line2,
      epoch: ts,
      timestamp: DateTime.utc_now(),
      data_type: :gp_json,
      latency_window: @freshness_window_seconds,
      trust_class: :public
    }
  end

  defp parse_gp_json(_), do: %{source: "CelesTrak", error: :parse_failed}

  @spec freshness_window() :: integer()
  def freshness_window, do: @freshness_window_seconds
end
