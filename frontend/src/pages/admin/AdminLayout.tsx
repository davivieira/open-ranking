import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Show,
  useColorMode,
} from "@chakra-ui/react";
import {MoonIcon, SunIcon} from "@chakra-ui/icons";
import {useTranslation} from "react-i18next";
import {Link as RouterLink, Outlet, useNavigate} from "react-router-dom";
import {useAuthStore} from "../../state/authStore";

export const AdminLayout = () => {
  const {t} = useTranslation(["admin", "common"]);
  const navigate = useNavigate();
  const {logout} = useAuthStore();
  const {colorMode, toggleColorMode} = useColorMode();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box minH="100vh" bg="brand.background" color="brand.text">
      <Flex
        as="header"
        px={8}
        py={4}
        alignItems="center"
        justifyContent="space-between"
        bg="brand.navbarBg"
      >
        <Heading size="md" color="brand.navbarTitle">
          VStrong Leaderboard Admin
        </Heading>
        {/* Desktop / tablet navigation */}
        <Show above="md">
          <Flex gap={4} align="center">
            <IconButton
              aria-label={t("colorMode.toggle", {ns: "common"})}
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              variant="ghost"
              onClick={toggleColorMode}
              color="brand.navbarTitle"
              _hover={{ color: "orange.400", bg: "whiteAlpha.200" }}
            />
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
        </Show>
        {/* Mobile navigation: collapse links into menu button */}
        <Show below="md">
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Admin menu"
              icon={
                <Box as="span" fontSize="lg" fontWeight="bold">
                  ☰
                </Box>
              }
              variant="outline"
            />
            <MenuList bg="brand.card" borderColor="whiteAlpha.300">
              <MenuItem onClick={toggleColorMode}>
                {colorMode === "dark" ? "Light mode" : "Dark mode"}
              </MenuItem>
              <MenuItem as={RouterLink} to="/admin">
                {t("nav.scores")}
              </MenuItem>
              <MenuItem as={RouterLink} to="/admin/athletes">
                {t("nav.athletes")}
              </MenuItem>
              <MenuItem as={RouterLink} to="/admin/setup">
                {t("nav.setup")}
              </MenuItem>
              <MenuItem onClick={handleLogout}>{t("nav.logout")}</MenuItem>
            </MenuList>
          </Menu>
        </Show>
      </Flex>
      <Box as="main" px={8} py={6}>
        <Outlet />
      </Box>
    </Box>
  );
};
