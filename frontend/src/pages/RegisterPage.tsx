import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../state/authStore";
import { apiClient } from "../lib/apiClient";

export type PasswordStrength = "weak" | "medium" | "strong";

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password.length) return "weak";
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
}

const DEBOUNCE_MS = 400;

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["auth", "common"]);
  const { register, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);

  const checkUsername = useCallback(async (value: string) => {
    if (!value.trim()) {
      setUsernameAvailable(null);
      return;
    }
    setUsernameCheckLoading(true);
    try {
      const res = await apiClient.get<{ available: boolean }>(
        `/auth/check-username?username=${encodeURIComponent(value.trim())}`,
      );
      setUsernameAvailable(res.available);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setUsernameCheckLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      checkUsername(username);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [username, checkUsername]);

  const strength = getPasswordStrength(password);
  const passwordsMatch = !password || !confirmPassword || password === confirmPassword;
  const canSubmit =
    username.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    passwordsMatch &&
    usernameAvailable === true &&
    !usernameCheckLoading;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    await register(username.trim(), password);
    const state = useAuthStore.getState();
    if (state.accessToken) {
      navigate("/admin");
    }
  };

  const strengthColor =
    strength === "weak" ? "red" : strength === "medium" ? "yellow" : "green";
  const strengthWidth = strength === "weak" ? "33%" : strength === "medium" ? "66%" : "100%";

  return (
    <Box
      minH="100vh"
      bg="brand.background"
      color="brand.text"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Card bg="brand.card" maxW="md" w="100%">
        <CardBody>
          <Stack spacing={6}>
            <Heading size="lg" color="brand.pageTitle" textAlign="center">
              {t("register.title", { ns: "auth" })}
            </Heading>
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}
            <Box as="form" onSubmit={handleSubmit}>
              <Stack spacing={4}>
                <FormControl
                  id="username"
                  isRequired
                  isInvalid={username.trim().length > 0 && usernameAvailable === false}
                >
                  <FormLabel>{t("register.username", { ns: "auth" })}</FormLabel>
                  <Input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    bg="white"
                    color="black"
                  />
                  {usernameCheckLoading && (
                    <FormHelperText>{t("register.checkingUsername", { ns: "auth" })}</FormHelperText>
                  )}
                  {username.trim().length > 0 && usernameAvailable === false && (
                    <FormErrorMessage>
                      {t("register.usernameTaken", { ns: "auth" })}
                    </FormErrorMessage>
                  )}
                </FormControl>
                <FormControl id="password" isRequired>
                  <FormLabel>{t("register.password", { ns: "auth" })}</FormLabel>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    bg="white"
                    color="black"
                  />
                  {password.length > 0 && (
                    <Box mt={2}>
                      <Box
                        h={2}
                        borderRadius="full"
                        bg="whiteAlpha.300"
                        overflow="hidden"
                        w="100%"
                      >
                        <Box
                          h="100%"
                          w={strengthWidth}
                          bg={`${strengthColor}.400`}
                          transition="width 0.2s"
                        />
                      </Box>
                      <Text fontSize="xs" color="brand.subtleText" mt={1}>
                        {t(`register.strength.${strength}`, { ns: "auth" })}
                      </Text>
                    </Box>
                  )}
                </FormControl>
                <FormControl
                  id="confirmPassword"
                  isRequired
                  isInvalid={confirmPassword.length > 0 && !passwordsMatch}
                >
                  <FormLabel>{t("register.confirmPassword", { ns: "auth" })}</FormLabel>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    bg="white"
                    color="black"
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <FormErrorMessage>
                      {t("register.passwordsDoNotMatch", { ns: "auth" })}
                    </FormErrorMessage>
                  )}
                </FormControl>
                <Button
                  type="submit"
                  colorScheme="orange"
                  isLoading={isLoading}
                  loadingText={t("register.registering", { ns: "auth" })}
                  isDisabled={!canSubmit}
                >
                  {t("register.submit", { ns: "auth" })}
                </Button>
              </Stack>
            </Box>
            <Text textAlign="center" fontSize="sm">
              {t("register.alreadyHaveAccount", { ns: "auth" })}{" "}
              <Link as={RouterLink} to="/login" color="brand.link">
                {t("register.signIn", { ns: "auth" })}
              </Link>
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
};
