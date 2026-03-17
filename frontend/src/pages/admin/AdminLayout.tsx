import { Box, Button, Flex, Heading } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../state/authStore";

export const AdminLayout = () => {
  const { t } = useTranslation("admin");
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
        bgGradient="linear(to-r, brand.background, brand.card, rgba(245,134,52,0.18))"
      >
        <Heading size="md" color="brand.yellow.400">
          Open Ranking Admin
        </Heading>
        <Flex gap={4} align="center">
          <Button as={RouterLink} to="/admin" variant="ghost">
            {t("nav.scores")}
          </Button>
          <Button as={RouterLink} to="/admin/athletes" variant="ghost">
            {t("nav.athletes")}
          </Button>
          <Button as={RouterLink} to="/admin/setup" variant="ghost">
            {t("nav.setup")}
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            {t("nav.logout")}
          </Button>
        </Flex>
      </Flex>
      <Box as="main" px={8} py={6}>
        <Outlet />
      </Box>
    </Box>
  );
};

