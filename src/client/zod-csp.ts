// zod-csp.ts: Our CSP forbids eval (script-src 'self'). Zod 4 otherwise probes `new Function`
// to compile fast parsers, which the browser reports as a CSP violation. Imported first in main.ts.
import { z } from "zod";

z.config({ jitless: true });
