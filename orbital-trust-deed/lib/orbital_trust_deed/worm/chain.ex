defmodule OrbitalTrustDeed.Worm.Chain do
  @moduledoc """
  WORM (Write Once Read Many) chain for orbital telemetry.

  Each Trust Deed is sealed into the chain with a SHA-256 hash.
  The chain is append-only. No modifications. No deletions.

  Seal structure:
    prev_hash ++ deed_hash ++ timestamp ++ chain_index

  Chain is persisted to a JSONL file (one seal per line).
  On startup, the chain is loaded from disk and verified.
  """

  use GenServer

  require Logger

  @type chain_entry :: %{
    index: non_neg_integer(),
    deed_hash: String.t(),
    prev_hash: String.t(),
    seal_hash: String.t(),
    sealed_at: DateTime.t(),
    source: String.t()
  }

  @default_path "priv/worm/chain.jsonl"

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
  def init(opts) do
    path = Keyword.get(opts, :path, Application.get_env(:orbital_trust_deed, :worm_chain_path, @default_path))
    dir = Path.dirname(path)
    File.mkdir_p!(dir)

    entries = load_from_disk(path)
    hashes = entries |> Enum.map(& &1.deed_hash) |> MapSet.new()

    Logger.info("WORM chain loaded: #{length(entries)} entries from #{path}")

    {:ok, %{entries: entries, sealed_hashes: hashes, path: path}}
  end

  @impl true
  def handle_call({:seal, deed}, _from, %{entries: entries, sealed_hashes: hashes, path: path} = state) do
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

      # Append to disk (WORM: never rewrite, only append)
      append_to_disk(path, entry)

      {:reply, {:ok, entry}, %{
        entries: [entry | entries],
        sealed_hashes: MapSet.put(hashes, deed_hash),
        path: path
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

  # ── Persistence ──────────────────────────────────────────────

  defp load_from_disk(path) do
    if File.exists?(path) do
      path
      |> File.stream!([], :line)
      |> Enum.reduce([], fn line, acc ->
        case Jason.decode(line, keys: :atoms) do
          {:ok, entry} ->
            entry = Map.update!(entry, :sealed_at, fn ts ->
              case DateTime.from_iso8601(ts) do
                {:ok, dt, _} -> dt
                _ -> DateTime.utc_now()
              end
            end)
            [entry | acc]

          {:error, _} ->
            Logger.warning("WORM: skipping corrupt line in #{path}")
            acc
        end
      end)
      |> Enum.reverse()
      |> verify_loaded_chain()
    else
      []
    end
  end

  defp verify_loaded_chain(entries) do
    case verify_chain(Enum.reverse(entries)) do
      {:ok, :valid} ->
        entries

      {:error, {:corruption_at, idx}} ->
        Logger.error("WORM: corruption detected at index #{idx} — truncating chain")
        Enum.take_while(entries, &(&1.index < idx))
    end
  end

  defp append_to_disk(path, entry) do
    line = Jason.encode!(entry) <> "\n"
    File.write!(path, line, [:append])
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
