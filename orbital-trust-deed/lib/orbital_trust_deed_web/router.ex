defmodule OrbitalTrustDeedWeb.Router do
  use OrbitalTrustDeedWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {OrbitalTrustDeedWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", OrbitalTrustDeedWeb do
    pipe_through :browser

    live "/", DashboardLive, :index
  end

  # Satellite API for external agents
  scope "/api/v1", OrbitalTrustDeedWeb do
    pipe_through :api

    get "/satellites/:norad_id/tle", SatelliteController, :get_tle
    get "/chain", ChainController, :get_chain
    get "/chain/stats", ChainController, :get_stats
    get "/deed/:deed_id", DeedController, :get_deed
    post "/verify", VerificationController, :verify_feed
  end
end
