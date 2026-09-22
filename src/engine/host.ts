/**
 * The three things the engine cannot work out for itself.
 *
 * Everything else here is the same wherever it runs: the same API calls, the
 * same cache keys, the same fold over the same bytes. These three are not,
 * and each of them is a fact about the page rather than about the reading.
 *
 * **Threads.** A worker is made from a URL, and which URL is a question only
 * the bundler can answer — `new URL('./analyse.worker.ts', import.meta.url)`
 * is a literal that Vite and webpack both rewrite at build time and neither
 * can rewrite from inside a dependency. So the host makes them. In practice
 * that is two lines per worker per application, each one importing a body
 * that lives here.
 *
 * **The module.** Where `cqx.wasm` is served from. A deployment puts it
 * beside itself; nothing in here can assume the path.
 *
 * **The store.** Which bucket of already-analysed datasets to try before
 * reading a repository from source. explorer.deka.gg and cqx.bio point at the
 * same one today, and a viewer opened on a folder points at none.
 *
 * Installed once, before anything else is called. A single object rather than
 * three setters because they are needed together and a page that set two of
 * them would fail late and confusingly — this way the failure, if there is
 * one, is that nothing was installed at all.
 */

export interface Host {
  /** The coordinator: one per analysis, ended when it finishes. */
  analyse(): Worker;
  /** Reader `index`, when a repository is large enough to divide. */
  read(index: number): Worker;
  /** Absolute URL of the cqx wasm module. */
  wasm: string;
  /**
   * The shared store of published datasets, or null for a deployment that
   * reads everything from source.
   */
  store: string | null;

  /**
   * Told when a commit had to be read in this tab, because neither this
   * browser nor the store had it.
   *
   * The fact, and only the fact: a repository and a commit. What this browser
   * computed is good enough for the person looking at it and is not evidence
   * of anything — what a repository scores, for everybody else, is decided by
   * a machine nobody can reach. So this says *that* a commit was visited cold,
   * and a trusted worker does the same work properly and publishes it.
   *
   * Optional, and never awaited. A deployment with nowhere to send it leaves
   * it out, and a deployment whose endpoint is down is not a deployment whose
   * reports fail.
   */
  cold?: (repo: string, sha: string) => void;
}

let installed: Host | null = null;

export function install(host: Host): void {
  installed = host;
}

/**
 * Named for what it is: a programming error, caught at the first call rather
 * than surfacing as an undefined worker three frames later.
 */
export function host(): Host {
  if (!installed) {
    throw new Error(
      '@cqxai/kit: install() was never called. A page has to say how to make a ' +
        'worker, where cqx.wasm is, and which store to read — see Host.',
    );
  }
  return installed;
}
