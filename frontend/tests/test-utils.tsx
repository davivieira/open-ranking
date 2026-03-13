import { ReactNode } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter } from "react-router-dom";
import { render } from "@testing-library/react";

import { theme } from "../src/theme";
import "../src/i18n";

export function renderWithProviders(ui: ReactNode) {
  return render(
    <ChakraProvider theme={theme}>
      <BrowserRouter>{ui}</BrowserRouter>
    </ChakraProvider>,
  );
}

