import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
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
      background: "#1C1130",
      card: "#2A1743",
    },
  },
  styles: {
    global: {
      "html, body": {
        bg: "brand.background",
        color: "gray.100",
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
                bg: "whiteAlpha.100",
                fontWeight: "semibold",
                textTransform: "none",
                letterSpacing: "tight",
              },
            },
          },
          tbody: {
            tr: {
              td: {
                borderColor: "whiteAlpha.100",
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

