import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FormEvent, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../state/authStore";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();
  const { t } = useTranslation(["auth", "common"]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await login(username, password);
    const state = useAuthStore.getState();
    if (state.accessToken) {
      navigate("/admin");
    }
  };

  return (
    <Box minH="100vh" bg="brand.background" color="brand.text" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Card bg="brand.card" maxW="md" w="100%">
        <CardBody>
          <Stack spacing={6}>
            <Heading size="lg" color="brand.pageTitle" textAlign="center">
              {t("login.title", { ns: "auth" })}
            </Heading>
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}
            <Box as="form" onSubmit={handleSubmit}>
              <Stack spacing={4}>
                <FormControl id="username" isRequired>
                  <FormLabel>{t("login.username", { ns: "auth" })}</FormLabel>
                  <Input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    bg="white"
                    color="black"
                  />
                </FormControl>
                <FormControl id="password" isRequired>
                  <FormLabel>{t("login.password", { ns: "auth" })}</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    bg="white"
                    color="black"
                  />
                </FormControl>
                <Button
                  type="submit"
                  colorScheme="orange"
                  isLoading={isLoading}
                  loadingText={t("login.signingIn", { ns: "auth" })}
                >
                  {t("login.signIn", { ns: "auth" })}
                </Button>
              </Stack>
            </Box>
            <Text textAlign="center" fontSize="sm">
              {t("login.newStudio", { ns: "auth" })}{" "}
              <Link as={RouterLink} to="/register" color="brand.link">
                {t("login.registerStudio", { ns: "auth" })}
              </Link>
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
};

