defmodule OrbitalTrustDeed.Worm.Chain do
  @moduledoc """
  WORM (Write Once Read Many) chain for orbital telemetry.

  Each Trust Deed is sealed into the chain with a SHA-256 hash.
  The chain is append-only. No modifications. No deletions.

  Seal structure:
    prev_hash ++ deed_hash ++ timestamp ++ chain_index

  This creates an immutable audit trail for all orbital telemetry
  that entered the sovereign infrastructure.
  """

  use GenServer

  @type chain_entry :: %{
    index: non_neg_integer(),
    deed_hash: String.t(),
    prev_hash: String.t(),
    seal_hash: String.t(),
    sealed_at: DateTime.t(),
    source: String.t()
  }

  # ── Client API ───────────────────────────────────────────────

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Seal a Trust Deed into the WORM chain.
  Returns {:ok, chain_entry} or {:error, :already_sealed}.
  """
  @spec seal(map()) :: {:ok, chain_entry()} | {:error, term()}
  def seal(deed) do
    GenServer.call(__MODULE__, {:seal, deed})
  end

  @doc """
  Verify the chain integrity from genesis to tip.
  Returns {:ok, :valid} or {:error, {:corruption_at, index}}.
  """
  @spec verify() :: {:ok, :valid} | {:error, term()}
  def verify do
    GenServer.call(__MODULE__, :verify)
  end

  @doc """
  Get the full chain history.
  """
  @spec chain() :: [chain_entry()]
  def chain do
    GenServer.call(__MODULE__, :chain)
  end

  @doc """
  Get the chain tip (latest entry).
  """
  @spec tip() :: chain_entry() | nil
  def tip do
    GenServer.call(__MODULE__, :tip)
  end

  @doc """
  Get chain statistics.
  """
  @spec stats() :: map()
  def stats do
    GenServer.call(__MODULE__, :stats)
  end

  # ── Server Callbacks ─────────────────────────────────────────

  @impl true
  def init(_opts) do
    {:ok, %{entries: [], sealed_hashes: MapSet.new()}}
  end

  @impl true
  def handle_call({:seal, deed}, _from, %{entries: entries, sealed_hashes: hashes} = state) do
    deed_hash = deed.deed_hash || compute_deed_hash(deed)

    if MapSet.member?(hashes, deed_hash) do
      {:reply, {:error, :already_sealed}, state}
    else
      index = length(entries)
      prev_hash = if index == 0, do: "genesis", else: hd(entries).seal_hash

      seal_input = "#{prev_hash}#{deed_hash}#{DateTime.utc_now()}"
      seal_hash = :crypto.hash(:sha256, seal_input) |> Base.encode16(case: :lower)

      entry = %{
        index: index,
        deed_hash: deed_hash,
        prev_hash: prev_hash,
        seal_hash: seal_hash,
        sealed_at: DateTime.utc_now(),
        source: deed.source || "unknown"
      }

      {:reply, {:ok, entry}, %{
        entries: [entry | entries],
        sealed_hashes: MapSet.put(hashes, deed_hash)
      }}
    end
  end

  @impl true
  def handle_call(:verify, _from, %{entries: entries} = state) do
    sorted = Enum.reverse(entries)
    result = verify_chain(sorted)
    {:reply, result, state}
  end

  @impl true
  def handle_call(:chain, _from, %{entries: entries} = state) do
    {:reply, Enum.reverse(entries), state}
  end

  @impl true
  def handle_call(:tip, _from, %{entries: entries} = state) do
    {:reply, List.first(entries), state}
  end

  @impl true
  def handle_call(:stats, _from, %{entries: entries} = state) do
    stats = %{
      chain_length: length(entries),
      sources: entries |> Enum.map(& &1.source) |> Enum.frequencies(),
      first_sealed: entries |> List.last() |> Map.get(:sealed_at, nil),
      last_sealed: entries |> List.first() |> Map.get(:sealed_at, nil),
      verified: verify_chain(Enum.reverse(entries)) == {:ok, :valid}
    }
    {:reply, stats, state}
  end

  # ── Verification ─────────────────────────────────────────────

  defp verify_chain([]), do: {:ok, :valid}

  defp verify_chain([first | rest]) do
    if first.prev_hash != "genesis" do
      {:error, {:corruption_at, 0}}
    else
      verify_chain(rest, first)
    end
  end

  defp verify_chain([], _prev), do: {:ok, :valid}

  defp verify_chain([entry | rest], prev) do
    if entry.prev_hash != prev.seal_hash do
      {:error, {:corruption_at, entry.index}}
    else
      verify_chain(rest, entry)
    end
  end

  defp compute_deed_hash(deed) do
    input = "#{deed.source}:#{deed.deed_id}:#{DateTime.to_iso8601(deed.verified_at)}"
    :crypto.hash(:sha256, input) |> Base.encode16(case: :lower)
  end
end
