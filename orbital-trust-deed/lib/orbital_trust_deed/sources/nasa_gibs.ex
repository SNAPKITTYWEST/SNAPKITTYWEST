defmodule OrbitalTrustDeed.Sources.NasaGibs do
  @moduledoc """
  NASA Worldview / GIBS near-real-time Earth imagery.
  Provides tile URLs for satellite imagery layers.
  No API key required for GIBS WMTS tiles.
  """

  require Logger

  @gibs_wmts_url "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best"
  @gibs_legend_url "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0"

  @doc """
  Returns a tile URL template for a given layer and date.
  Supported layers: MODIS_Terra_CorrectedReflectance_TrueColor, VIIRS_BlackMarble, etc.
  """
  @spec tile_url(String.t(), Date.t(), integer(), integer(), integer()) :: String.t()
  def tile_url(layer, date, z, y, x) do
    date_str = Date.to_string(date)
    "#{@gibs_wmts_url}/#{layer}/default/#{date_str}/250m/#{z}/#{y}/#{x}.jpg"
  end

  @doc """
  Returns the imagery metadata for a layer at a given time.
  """
  @spec layer_info(String.t()) :: map()
  def layer_info(layer) do
    %{
      source: "NASA GIBS",
      source_uri: "#{@gibs_legend_url}/#{layer}/default/1.0.0/1.0.0.xml",
      layer: layer,
      timestamp: DateTime.utc_now(),
      data_type: :wmts_tile,
      latency_window: 3600 * 5,
      trust_class: :public,
      formats: ["image/jpeg", "image/png"],
      crs: "EPSG:4326"
    }
  end

  @doc """
  Commonly used layers for the orbital dashboard.
  """
  @spec available_layers() :: [map()]
  def available_layers do
    [
      %{
        id: "MODIS_Terra_CorrectedReflectance_TrueColor",
        name: "MODIS Terra True Color",
        description: "Near-real-time Earth imagery from Terra",
        latency: "3-5 hours"
      },
      %{
        id: "VIIRS_BlackMarble",
        name: "VIIRS Black Marble",
        description: "Night lights / city illumination",
        latency: "24 hours"
      },
      %{
        id: "MODIS_Terra_Aerosol",
        name: "MODIS Terra Aerosol",
        description: "Aerosol optical depth",
        latency: "3-5 hours"
      },
      %{
        id: "OMI_SO2_Tropolumnar",
        name: "OMI SO2",
        description: "Sulfur dioxide tropospheric column",
        latency: "24 hours"
      },
      %{
        id: "VIIRS_Fires_375m_All",
        name: "VIIRS Active Fires",
        description: "Active fire detections",
        latency: "3-5 hours"
      }
    ]
  end

  @doc """
  Validates that GIBS is reachable and returning valid tiles.
  """
  @spec health_check() :: {:ok, term()} | {:error, term()}
  def health_check do
    url = tile_url("MODIS_Terra_CorrectedReflectance_TrueColor", Date.utc_today(), 0, 0, 0)

    case HTTPoison.head(url, [{"User-Agent", "SnapKittyOrbital/1.0"}], timeout: 5_000) do
      {:ok, %{status_code: 200}} -> {:ok, :healthy}
      {:ok, %{status_code: 304}} -> {:ok, :healthy}
      {:ok, %{status_code: s}} -> {:error, {:status, s}}
      {:error, reason} -> {:error, reason}
    end
  end
end
