import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: true,
};

export const theme = extendTheme({
  config,
  semanticTokens: {
    colors: {
      "brand.primaryBg": {
        default: "#1C1130",
        _light: "#1C1130",
      },
      "brand.navbarBg": {
        default: "#1C1130",
        _light: "#1C1130",
      },
      "brand.navbarTitle": {
        default: "#F7D23E",
        _light: "#FFFFFF",
      },
      "brand.pageTitle": {
        default: "#F7D23E",
        _light: "#2C1848",
      },
      "brand.link": {
        default: "#F7D23E",
        _light: "#2C1848",
      },
      "brand.background": {
        default: "#1C1130",
        _light: "#F6F4FB",
      },
      "brand.card": {
        default: "#2A1743",
        _light: "white",
      },
      "brand.text": {
        default: "#F7FAFC",
        _light: "#1A202C",
      },
      "brand.subtleText": {
        default: "#CBD5E0",
        _light: "#4A5568",
      },
      "brand.tableHeaderBg": {
        default: "rgba(255,255,255,0.08)",
        _light: "rgba(0,0,0,0.04)",
      },
      "brand.tableBorder": {
        default: "rgba(255,255,255,0.08)",
        _light: "rgba(0,0,0,0.08)",
      },
      "brand.headerGradientEnd": {
        default: "rgba(245,134,52,0.18)",
        _light: "rgba(245,134,52,0.10)",
      },
    },
  },
  colors: {
    brand: {
      purple: {
        500: "#4B2A7A",
        700: "#2C1848",
      },
      yellow: {
        400: "#F7D23E",
      },
      orange: {
        400: "#F58634",
      },
      green: {
        400: "#2ECC71",
      },
    },
  },
  styles: {
    global: {
      "html, body": {
        bg: "brand.background",
        color: "brand.text",
      },
      "@media print": {
        ".no-print": {
          display: "none !important",
        },
        body: {
          bg: "white",
          color: "black",
        },
        "table, th, td": {
          borderColor: "gray.300 !important",
          color: "black",
        },
        "a": {
          color: "gray.800",
        },
      },
    },
  },
  components: {
    Button: {
      variants: {
        solid: {
          bg: "brand.orange.400",
          _hover: { bg: "brand.yellow.400", color: "black" },
        },
      },
      defaultProps: {
        colorScheme: "orange",
      },
    },
    Card: {
      baseStyle: {
        bg: "brand.card",
        borderRadius: "md",
        boxShadow: "lg",
      },
    },
    Table: {
      variants: {
        simple: {
          thead: {
            tr: {
              th: {
                bg: "brand.tableHeaderBg",
                fontWeight: "semibold",
                textTransform: "none",
                letterSpacing: "tight",
              },
            },
          },
          tbody: {
            tr: {
              td: {
                borderColor: "brand.tableBorder",
              },
            },
          },
        },
      },
    },
    Tag: {
      baseStyle: {
        borderRadius: "full",
        fontWeight: "semibold",
      },
    },
  },
});

