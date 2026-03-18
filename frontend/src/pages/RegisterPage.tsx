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
import { useAuthStore } from "../state/authStore";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await register(email, password);
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
              Register your studio
            </Heading>
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}
            <Box as="form" onSubmit={handleSubmit}>
              <Stack spacing={4}>
                <FormControl id="email" isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    bg="white"
                    color="black"
                  />
                </FormControl>
                <FormControl id="password" isRequired>
                  <FormLabel>Password</FormLabel>
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
                  loadingText="Registering..."
                >
                  Register
                </Button>
              </Stack>
            </Box>
            <Text textAlign="center" fontSize="sm">
              Already have an account?{" "}
              <Link as={RouterLink} to="/login" color="brand.yellow.400">
                Sign in
              </Link>
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Box>
  );
};
