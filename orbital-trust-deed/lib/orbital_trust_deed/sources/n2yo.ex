defmodule OrbitalTrustDeed.Sources.N2yo do
  @moduledoc """
  N2YO satellite tracking REST API.
  Requires free API key from https://www.n2yo.com/api/
  Free tier: 100 requests/day.
  """

  require Logger

  @base_url "https://api.n2yo.com/rest/v1"

  @doc """
  Get current position using API key from config.
  """
  @spec get_position(String.t()) :: {:ok, map()} | {:error, term()}
  def get_position(norad_id) do
    api_key = Application.get_env(:orbital_trust_deed, :n2yo_api_key, "")
    get_position(norad_id, api_key)
  end

  @doc """
  Get current position of a satellite by NORAD ID.
  Returns lat, lon, alt, timestamp.
  """
  @spec get_position(String.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def get_position(norad_id, api_key) when api_key != "" and api_key != nil do
    url = "#{@base_url}/satellite/position/#{norad_id}/0/0/0/1&apiKey=#{api_key}"

    case HTTPoison.get(url, [{"User-Agent", "SnapKittyOrbital/1.0"}], timeout: 10_000) do
      {:ok, %{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"positions" => [pos | _]}} ->
            {:ok, %{
              source: "N2YO",
              source_uri: url,
              norad_id: norad_id,
              satlatitude: pos["satlatitude"],
              satlongitude: pos["satlongitude"],
              sataltitude: pos["sataltitude"],
              timestamp: DateTime.utc_now(),
              data_type: :position,
              latency_window: 300,
              trust_class: :public,
              api_key_required: true
            }}

          {:ok, other} ->
            {:error, {:unexpected_response, other}}

          {:error, reason} ->
            {:error, {:parse_error, reason}}
        end

      {:ok, %{status_code: 401}} ->
        {:error, :invalid_api_key}

      {:ok, %{status_code: 429}} ->
        {:error, :rate_limit_exceeded}

      {:ok, %{status_code: status}} ->
        {:error, {:http_error, status}}

      {:error, reason} ->
        {:error, {:network_error, reason}}
    end
  end

  def get_position(_norad_id, _api_key) do
    {:error, :no_api_key}
  end

  @doc """
  Get pass predictions for a satellite over a ground station.
  """
  @spec get_passes(String.t(), float(), float(), integer(), String.t()) :: {:ok, [map()]} | {:error, term()}
  def get_passes(norad_id, lat, lon, days, api_key) when api_key != "" and api_key != nil do
    url = "#{@base_url}/satellite/passes/#{norad_id}/#{lat}/#{lon}/0/#{days}&apiKey=#{api_key}"

    case HTTPoison.get(url, [{"User-Agent", "SnapKittyOrbital/1.0"}], timeout: 10_000) do
      {:ok, %{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"passes" => passes}} ->
            {:ok, Enum.map(passes, &parse_pass/1)}

          {:error, reason} ->
            {:error, {:parse_error, reason}}
        end

      {:ok, %{status_code: 401}} ->
        {:error, :invalid_api_key}

      {:error, reason} ->
        {:error, {:network_error, reason}}
    end
  end

  def get_passes(_norad_id, _lat, _lon, _days, _api_key) do
    {:error, :no_api_key}
  end

  @doc """
  Source metadata for the trust deed system.
  """
  @spec source_metadata() :: map()
  def source_metadata do
    %{
      source: "N2YO",
      source_uri: "https://api.n2yo.com/rest/v1",
      timestamp: DateTime.utc_now(),
      data_type: :position,
      latency_window: 300,
      trust_class: :public,
      api_key_required: true,
      free_tier: "100 requests/day",
      signup_url: "https://www.n2yo.com/api/"
    }
  end

  defp parse_pass(%{
    "startUTC" => start_utc,
    "endUTC" => end_utc,
    "maxEl" => max_el
  }) do
    {:ok, start_dt, _} = DateTime.from_unix(start_utc)
    {:ok, end_dt, _} = DateTime.from_unix(end_utc)

    %{
      start: start_dt,
      end: end_dt,
      max_elevation: max_el,
      duration_minutes: DateTime.diff(end_dt, start_dt, :minute)
    }
  end

  defp parse_pass(pass), do: pass
end
