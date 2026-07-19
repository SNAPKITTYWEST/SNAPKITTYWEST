defmodule OrbitalTrustDeed.Application do
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      OrbitalTrustDeed.Worm.Chain
    ]

    opts = [strategy: :one_for_one, name: OrbitalTrustDeed.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
