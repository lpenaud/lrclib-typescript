export interface LrcLibApiClientConstructorOptions {
  url: string | URL;
  userAgent?: string;
}

export interface LrcLibApiClientGetOptions {
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
}

export interface LrcLibApiClientSearchOptions {
  q?: string;
  trackName?: string;
  artistName?: string;
  albumName?: string;
}

export interface LrcLibApiClientGetResponse {
  id: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics?: string;
  syncedLyrics?: string;
}

interface LrcLibApiClientCallOptions {
  method: "GET" | "POST";
  urlPath: string;
  params?: URLSearchParams;
}

function httpStatusSeries(status: number): number {
  return Math.floor(status / 100);
}

export class LrcLibApiClient {
  #url: URL;

  #headers: HeadersInit;

  constructor({ url, userAgent }: LrcLibApiClientConstructorOptions) {
    this.#url = new URL(url);
    this.#headers = {};
    if (userAgent) {
      this.#headers["User-Agent"] = userAgent;
    }
  }

  async get(
    options: LrcLibApiClientGetOptions,
  ): Promise<LrcLibApiClientGetResponse | null> {
    const params = new URLSearchParams({
      "track_name": options.trackName,
      "artist_name": options.artistName,
    });
    if (options.albumName) {
      params.set("album_name", options.albumName);
    }
    if (options.duration) {
      params.set("duration", options.duration.toString(10));
    }
    const res = await this.#fetch({
      method: "GET",
      urlPath: "api/get",
      params,
    });
    if (res.status === 404) {
      console.error("Lyrics not found", options);
      return null;
    }
    return res.json();
  }

  async getById(id: number): Promise<Blob> {
    const res = await this.#fetch({
      method: "GET",
      urlPath: `api/get/${id}`,
    });
    if (res.status === 404) {
      console.error(await res.text());
      throw new Error("Lycris not found");
    }
    return res.blob();
  }

  async search(
    options: LrcLibApiClientSearchOptions,
  ): Promise<LrcLibApiClientGetOptions[]> {
    const params = new URLSearchParams();
    if (options.q) {
      params.set("q", options.q);
    }
    if (options.trackName) {
      params.set("track_name", options.trackName);
    }
    if (options.artistName) {
      params.set("artist_name", options.artistName);
    }
    if (options.albumName) {
      params.set("album_name", options.albumName);
    }
    const res = await this.#fetch({
      method: "GET",
      urlPath: "api/search",
      params,
    });
    if (httpStatusSeries(res.status) === 4) {
      console.error("Invalid search", options);
      console.error(await res.json());
      throw new Error("Invalid search");
    }
    return res.json();
  }

  async #fetch({ urlPath, method, params }: LrcLibApiClientCallOptions) {
    const url = new URL(urlPath, this.#url);
    if (params) {
      for (const [name, value] of params) {
        url.searchParams.append(name, value);
      }
    }
    const res = await fetch(url, {
      method,
      headers: new Headers(this.#headers),
    });
    if (httpStatusSeries(res.status) === 5) {
      console.error(await res.text());
      throw new Error(`${res.status} ${res.statusText}`);
    }
    return res;
  }
}
