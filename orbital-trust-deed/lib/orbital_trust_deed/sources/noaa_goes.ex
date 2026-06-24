defmodule OrbitalTrustDeed.Sources.NoaaGoes do
  @moduledoc """
  NOAA GOES geostationary weather imagery.
  Provides access to GOES-16/17/18 ABI imagery via NOAA AWS.
  No API key required for public GOES data.
  """

  @aws_base "https://noaa-goes18.s3.amazonaws.com"
  @abi_l2_base "ABI-L2-CMIPF"

  @doc """
  Returns the latest GOES ABI image URL for a given band and product.
  Bands: 1-16 for ABI. Common: Ch02 (Red), Ch09 (Mid-level Water Vapor), Ch13 (Clean IR).
  """
  @spec imagery_url(atom(), Date.t()) :: String.t()
  def imagery_url(band \\ :ch13, date \\ Date.utc_today()) do
    date_str = Date.to_string(date)
    "#{@aws_base}/ABI-L2-CMIPF/#{date_str}/00/OR_ABI-L2-CMIPF-M6C#{band_num(band)}_G18_*.nc"
  end

  @doc """
  GOES sector bounding boxes for continental views.
  """
  @spec sector(atom()) :: %{lat_min: float(), lat_max: float(), lon_min: float(), lon_max: float()}
  def sector(:full_disk) do
    %{lat_min: -81.3, lat_max: 81.3, lon_min: -156.0, lon_max: 6.0}
  end

  def sector(:conus) do
    %{lat_min: 15.0, lat_max: 72.0, lon_min: -145.0, lon_max: -55.0}
  end

  def sector(:mexico) do
    %{lat_min: 5.0, lat_max: 40.0, lon_min: -125.0, lon_max: -75.0}
  end

  @doc """
  Source metadata for the trust deed system.
  """
  @spec source_metadata() :: map()
  def source_metadata do
    %{
      source: "NOAA GOES-18",
      source_uri: "https://noaa-goes18.s3.amazonaws.com",
      timestamp: DateTime.utc_now(),
      data_type: :abi_imagery,
      latency_window: 300,
      trust_class: :public,
      satellite: "GOES-18",
      position: "137.2°W"
    }
  end

  @doc """
  Real-time GOES imagery tile URL for Leaflet/MapLibre.
  Uses the NOAA GOES Image Viewer.
  """
  @spec tile_url(String.t()) :: String.t()
  def tile_url(product \\ "ABI-FD") do
    "https://cdn.star.nesdis.noaa.gov/#{product}/ABI-FD/latest.jpg"
  end

  defp band_num(:ch02), do: "02"
  defp band_num(:ch07), do: "07"
  defp band_num(:ch09), do: "09"
  defp band_num(:ch13), do: "13"
  defp band_num(:ch16), do: "16"
  defp band_num(_), do: "13"
end
