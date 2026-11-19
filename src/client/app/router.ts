// router.ts: Simple hash router for SaafSaans.
// Routes: #/, #/setup, #/today, #/share, #/demo

export type RoutePath = "/" | "/setup" | "/today" | "/share" | "/demo";

export type RouteHandler = (path: RoutePath, params?: URLSearchParams) => void;

class HashRouter {
  private handlers: Map<RoutePath, RouteHandler> = new Map();
  private currentPath: RoutePath = "/";

  constructor() {
    window.addEventListener("hashchange", () => this.handleHashChange());
  }

  public register(path: RoutePath, handler: RouteHandler): void {
    this.handlers.set(path, handler);
  }

  public navigate(path: RoutePath): void {
    window.location.hash = path === "/" ? "#/" : `#${path}`;
  }

  public getCurrentPath(): RoutePath {
    return this.parseHash();
  }

  public start(): void {
    this.handleHashChange();
  }

  private parseHash(): RoutePath {
    let raw = window.location.hash;
    if (!raw || raw === "#" || raw === "#/") {
      return "/";
    }
    // Remove leading # and optional /
    raw = raw.replace(/^#\/?/, "");
    const clean = `/${raw.split("?")[0]}` as RoutePath;
    if (["/", "/setup", "/today", "/share", "/demo"].includes(clean)) {
      return clean;
    }
    return "/";
  }

  private handleHashChange(): void {
    const hash = window.location.hash;
    const path = this.parseHash();
    this.currentPath = path;

    const queryString = hash.includes("?") ? hash.split("?")[1] : "";
    const params = new URLSearchParams(queryString);

    const handler = this.handlers.get(path) || this.handlers.get("/");
    if (handler) {
      handler(path, params);
    }
  }
}

export const router = new HashRouter();
