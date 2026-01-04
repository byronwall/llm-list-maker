import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { MetaProvider } from "@solidjs/meta";
import { Suspense } from "solid-js";
import { css } from "styled-system/css";
import { Box } from "styled-system/jsx";

import "./index.css";

export default function App() {
  return (
    <MetaProvider>
      <Router
        root={(props) => (
          <Box class={css({ minH: "dvh" })}>
            <Suspense>{props.children}</Suspense>
          </Box>
        )}
      >
        <FileRoutes />
      </Router>
    </MetaProvider>
  );
}
