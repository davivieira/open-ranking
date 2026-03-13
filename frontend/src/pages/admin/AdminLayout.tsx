import { Box, Button, Flex, Heading } from "@chakra-ui/react";
import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../state/authStore";

export const AdminLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box minH="100vh" bg="brand.background" color="white">
      <Flex
        as="header"
        px={8}
        py={4}
        alignItems="center"
        justifyContent="space-between"
        bg="brand.card"
      >
        <Heading size="md" color="brand.yellow.400">
          Open Ranking Admin
        </Heading>
        <Flex gap={4} align="center">
          <Button as={RouterLink} to="/admin" variant="ghost">
            Scores
          </Button>
          <Button as={RouterLink} to="/admin/athletes" variant="ghost">
            Athlete Profiles
          </Button>
          <Button as={RouterLink} to="/admin/setup" variant="ghost">
            Setup
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </Flex>
      </Flex>
      <Box as="main" px={8} py={6}>
        <Outlet />
      </Box>
    </Box>
  );
};

