import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const LandingPage = () => {
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState("");
  const { t } = useTranslation(["common"]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      const path = url.pathname;
      const match = path.match(/\/home\/([^/]+)/);
      if (match) {
        navigate(`/home/${match[1]}`);
      } else {
        const slug = path.replace(/^\/+|\/+$/g, "");
        if (slug) navigate(`/home/${slug}`);
      }
    } catch {
      const slug = trimmed.replace(/^.*\/home\/?/, "").replace(/\/.*$/, "").trim();
      if (slug) navigate(`/home/${slug}`);
    }
  };

  return (
    <Box minH="100vh" bg="brand.background" color="white" py={16}>
      <Container maxW="md">
        <Stack spacing={8}>
          <Heading size="xl" color="brand.yellow.400" textAlign="center">
            {t("appName")}
          </Heading>
          <Text textAlign="center" color="gray.300">
            {t("landing.instructions", {
              defaultValue: "Use the link shared by your studio to view the leaderboard.",
            })}
          </Text>
          <Box as="form" onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>
                  {t("landing.pasteLinkLabel", {
                    defaultValue: "Paste your competition link",
                  })}
                </FormLabel>
                <Input
                  placeholder={t("landing.pasteLinkPlaceholder", {
                    defaultValue: "https://.../home/open-2025-abc123",
                  })}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  bg="white"
                  color="black"
                />
              </FormControl>
              <Button type="submit" colorScheme="orange">
                {t("landing.goToLeaderboard", {
                  defaultValue: "Go to leaderboard",
                })}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};
