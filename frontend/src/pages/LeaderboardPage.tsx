import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  Show,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useColorMode,
} from "@chakra-ui/react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
import { apiClient, API_BASE_URL } from "../lib/apiClient";
import { exportElementToPdf } from "../lib/exportToPdf";
import { useAuthStore } from "../state/authStore";

type Competition = { id: number; name: string; slug: string; public_slug: string; type: string };
type Phase = { id: number; competition_id: number; code: string; name: string; order_index: number };
type Event = {
  id: number;
  phase_id: number;
  code: string;
  name: string;
  event_type: string;
  gender_category: string;
  is_finished?: boolean;
};

type LeaderboardEntry = {
  rank: number;
  athlete?: { id: number; name: string };
  athlete_pair?: { athlete1: { id: number; name: string }; athlete2: { id: number; name: string } };
  total_points: number;
  event_count: number;
};

const LEVEL_OPTIONS = [
  { value: "RX", label: "Rx" },
  { value: "SCALED", label: "Scaled" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "DOUBLE_RX", label: "Double Rx" },
  { value: "DOUBLE_SCALED", label: "Double Scaled" },
  { value: "DOUBLE_BEGINNER", label: "Double Beginner" },
];

export const LeaderboardPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation("leaderboard");
  const { colorMode, toggleColorMode } = useColorMode();
  const { accessToken } = useAuthStore();
  const isLoggedIn = Boolean(accessToken);

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [competitionError, setCompetitionError] = useState<string | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const leaderboardCardRef = useRef<HTMLDivElement>(null);

  const phaseId = searchParams.get("phase") || "";
  const level = searchParams.get("level") || "RX";
  const gender = searchParams.get("gender") || "MALE";
  const eventId = searchParams.get("event") || "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (!slug) {
      setCompetition(null);
      setCompetitionError("No competition specified");
      return;
    }
    setCompetitionError(null);
    apiClient
      .get<Competition>(`/competitions/public/${slug}`)
      .then(setCompetition)
      .catch(() => {
        setCompetition(null);
        setCompetitionError("Competition not found");
      });
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      setPhases([]);
      updateParams({ phase: "", event: "" });
      return;
    }
    if (!competition) {
      setPhases([]);
      return;
    }
    apiClient
      .get<Phase[]>(`/competitions/public/${slug}/phases`)
      .then((p) => {
        setPhases(p);
        if (phaseId && !p.some((x) => String(x.id) === phaseId)) {
          updateParams({ phase: "", event: "" });
        }
      })
      .catch(() => setPhases([]));
  }, [slug, competition, phaseId, updateParams]);

  useEffect(() => {
    if (!slug || !phaseId) {
      setEvents([]);
      updateParams({ event: "" });
      return;
    }
    apiClient
      .get<Event[]>(`/competitions/public/${slug}/phases/${phaseId}/events`)
      .then((eventsList) => {
        setEvents(eventsList);
        if (eventId && !eventsList.some((e) => String(e.id) === eventId)) {
          updateParams({ event: "" });
        }
      })
      .catch(() => setEvents([]));
  }, [slug, phaseId, eventId, updateParams]);

  useEffect(() => {
    if (!competition || !phaseId || !level || !gender) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({
      competition_id: String(competition.id),
      phase_id: phaseId,
      level,
      gender,
    });
    if (eventId) params.set("event_id", eventId);
    apiClient
      .get<LeaderboardEntry[]>(`/leaderboard?${params}`)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load leaderboard");
          setEntries([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [competition, phaseId, level, gender, eventId]);

  const canFetch = Boolean(competition && phaseId);
  const relevantEvents = events.filter((e) => {
    if (gender === "MALE") {
      return e.gender_category === "MALE" || e.gender_category === "MIXED";
    }
    // gender === "FEMALE"
    return e.gender_category === "FEMALE" || e.gender_category === "MIXED";
  });
  const isPhaseFinished =
    relevantEvents.length > 0 && relevantEvents.every((e) => e.is_finished);

  const medalForRank = (rank: number): string => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  const handleExport = async (format: "csv") => {
    if (!competition || !phaseId) return;
    const params = new URLSearchParams({
      competition_id: String(competition.id),
      phase_id: phaseId,
      level,
      gender,
      format,
    });
    if (eventId) params.set("event_id", eventId);
    const url = `${API_BASE_URL}/leaderboard/export?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition");
    const match = disposition?.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : `leaderboard.${format}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDownloadPdf = async () => {
    if (!leaderboardCardRef.current || !competition || !phaseId) return;
    setPdfLoading(true);
    try {
      await exportElementToPdf(
        leaderboardCardRef.current,
        `leaderboard-${competition.public_slug}-${phaseId}`,
      );
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="brand.background" color="brand.text" py={8}>
      <Container maxW="6xl">
        <Flex
          justify={{ base: "flex-start", md: "space-between" }}
          align={{ base: "flex-start", md: "center" }}
          mb={8}
          className="no-print"
          bg="brand.navbarBg"
          borderRadius="lg"
          px={{ base: 4, md: 6 }}
          py={{ base: 3, md: 4 }}
          flexDirection={{ base: "column", sm: "row" }}
          gap={{ base: 3, sm: 0 }}
        >
          <Heading as="h1" size={{ base: "xl", md: "2xl" }} color="brand.navbarTitle">
            {competition?.name ?? t("common:appName")}
          </Heading>
          <HStack spacing={2} flexWrap="wrap">
            <IconButton
              aria-label={t("common:colorMode.toggle")}
              icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
              variant="outline"
              onClick={toggleColorMode}
              color="brand.navbarTitle"
              borderColor="whiteAlpha.400"
              _hover={{ color: "orange.400", borderColor: "orange.400", bg: "whiteAlpha.200" }}
            />
            {!isLoggedIn && (
              <>
                <Show above="md">
                  <Button
                    as={RouterLink}
                    to="/login"
                    variant="outline"
                    color="brand.navbarTitle"
                    borderColor="whiteAlpha.400"
                  >
                    {t("common:signInAsAdmin")}
                  </Button>
                  <Button as={RouterLink} to="/register" variant="solid" colorScheme="orange" color="white">
                    {t("common:signUp")}
                  </Button>
                </Show>
                <Show below="md">
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      aria-label={t("common:signIn")}
                      icon={<Box as="span" fontSize="lg">☰</Box>}
                      variant="outline"
                      color="brand.navbarTitle"
                      borderColor="whiteAlpha.400"
                    />
                    <MenuList>
                      <MenuItem as={RouterLink} to="/login">
                        {t("common:signInAsAdmin")}
                      </MenuItem>
                      <MenuItem as={RouterLink} to="/register" fontWeight="semibold">
                        {t("common:signUp")}
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Show>
              </>
            )}
          </HStack>
        </Flex>

        {competitionError && (
          <Alert status="error" borderRadius="md" mb={4} className="no-print">
            <AlertIcon />
            {competitionError === "No competition specified"
              ? t("errors.noCompetitionSpecified")
              : t("errors.competitionNotFound")}
          </Alert>
        )}

        {error && (
          <Alert status="error" borderRadius="md" mb={4} className="no-print">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {competition && (
          <Stack spacing={6} mb={8} className="no-print">
            <Flex gap={4} flexWrap="wrap" align="flex-end">
              <FormControl maxW="200px">
                <FormLabel>{t("filters.stage")}</FormLabel>
                <Select
                  value={phaseId}
                  onChange={(e) => updateParams({ phase: e.target.value, event: "" })}
                  bg="white"
                  color="black"
                  placeholder={t("placeholders.selectStage")}
                >
                {phases.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl maxW="160px">
              <FormLabel>{t("filters.level")}</FormLabel>
              <Select value={level} onChange={(e) => updateParams({ level: e.target.value })} bg="white" color="black">
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl maxW="140px">
              <FormLabel>{t("filters.gender")}</FormLabel>
              <Select value={gender} onChange={(e) => updateParams({ gender: e.target.value })} bg="white" color="black">
                <option value="MALE">{t("gender.male")}</option>
                <option value="FEMALE">{t("gender.female")}</option>
              </Select>
            </FormControl>
            <FormControl maxW="200px">
              <FormLabel>{t("filters.eventOptional")}</FormLabel>
              <Select
                value={eventId}
                onChange={(e) => updateParams({ event: e.target.value })}
                bg="white"
                color="black"
                placeholder={t("placeholders.allEvents")}
                isDisabled={!phaseId}
              >
                <option value="">{t("placeholders.allEvents")}</option>
                {events.map((e) => (
                  <option key={e.id} value={String(e.id)}>
                    {e.name} ({e.gender_category})
                  </option>
                ))}
              </Select>
            </FormControl>
            {canFetch && (
              <HStack gap={2}>
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  Print
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadPdf}
                  isLoading={pdfLoading}
                >
                  Download PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleExport("csv")}>
                  Export CSV
                </Button>
              </HStack>
            )}
          </Flex>
        </Stack>
        )}

        <Box ref={leaderboardCardRef} bg="brand.card" borderRadius="lg" p={4} overflowX="auto">
          <Heading size="md" color="brand.pageTitle" mb={4}>
            {competition ? t("title", { competition: competition.name }) : t("title", { competition: "" })}
          </Heading>
          {!competition ? (
            <Box color="gray.400">Loading competition…</Box>
          ) : !canFetch ? (
            <Box color="gray.400">Select stage to view leaderboard.</Box>
          ) : isLoading ? (
            <Flex justify="center" py={8}>
              <Spinner size="lg" color="brand.yellow.400" />
            </Flex>
          ) : (
            <Table variant="simple" size="md">
              <Thead position="sticky" top={0} zIndex={1} bg="whiteAlpha.100">
                <Tr>
                  <Th>{t("table.rank")}</Th>
                  <Th>{t("table.athletes")}</Th>
                  <Th isNumeric>{t("table.totalPoints")}</Th>
                  <Th isNumeric>{t("table.events")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {entries.map((row) => (
                  <Tr key={row.rank}>
                    <Td>{row.rank}</Td>
                    <Td>
                      {row.athlete ? (
                        <>
                          <RouterLink
                            to={`/athletes/${row.athlete.id}`}
                            style={{
                              color: "var(--chakra-colors-brand-link)",
                              textDecoration: "underline",
                            }}
                          >
                            {row.athlete.name}
                          </RouterLink>
                          {isPhaseFinished && medalForRank(row.rank) && (
                            <span style={{ marginLeft: 8 }}>{medalForRank(row.rank)}</span>
                          )}
                        </>
                      ) : row.athlete_pair ? (
                        <Flex gap={2}>
                          <RouterLink
                            to={`/athletes/${row.athlete_pair.athlete1.id}`}
                            style={{
                              color: "var(--chakra-colors-brand-link)",
                              textDecoration: "underline",
                            }}
                          >
                            {row.athlete_pair.athlete1.name}
                          </RouterLink>
                          <span>/</span>
                          <RouterLink
                            to={`/athletes/${row.athlete_pair.athlete2.id}`}
                            style={{
                              color: "var(--chakra-colors-brand-link)",
                              textDecoration: "underline",
                            }}
                          >
                            {row.athlete_pair.athlete2.name}
                          </RouterLink>
                          {isPhaseFinished && medalForRank(row.rank) && (
                            <span style={{ marginLeft: 8 }}>{medalForRank(row.rank)}</span>
                          )}
                        </Flex>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td isNumeric>{row.total_points}</Td>
                    <Td isNumeric>{row.event_count}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
          {canFetch && !isLoading && entries.length === 0 && (
            <Box color="gray.400" mt={4}>
              {t("empty.noScores")}
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
};
