import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Link,
  List,
  ListItem,
  Spinner,
  Stack,
  Tag,
  HStack,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../lib/apiClient";
import { useTranslation } from "react-i18next";

type AthleteProfile = {
  id: number;
  name: string;
  gender: string;
  level: string;
  doubles_level: string;
  birth_date: string | null;
  age: number | null;
  events_participated: number;
   event_wins: number;
   stage_wins: number;
};

type AthleteHistoryEntry = {
  id: number;
  athlete_id: number;
  competition_id: number;
  phase_id: number | null;
  event_id: number | null;
  entry: string;
  competition_public_slug?: string | null;
  competition_year?: number | null;
  phase_name?: string | null;
  podium_rank?: number | null;
  level?: string | null;
  event_name?: string | null;
  event_description?: string | null;
  winner_name?: string | null;
  winner_result?: string | null;
  athlete_result?: string | null;
};

export const AthleteProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(["common"]);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [history, setHistory] = useState<AthleteHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      apiClient.get<AthleteProfile>(`/athletes/${id}`),
      apiClient.get<AthleteHistoryEntry[]>(`/athletes/${id}/history`),
    ])
      .then(([prof, hist]) => {
        if (!cancelled) {
          setProfile(prof);
          setHistory(hist);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (isLoading) {
    return (
      <Box minH="100vh" bg="brand.background" color="white" py={10}>
        <Container maxW="4xl">
          <Flex justify="center" py={16}>
            <Spinner
              size="xl"
              color="brand.yellow.400"
              label={t("loading")}
            />
          </Flex>
        </Container>
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box minH="100vh" bg="brand.background" color="white" py={10}>
        <Container maxW="4xl">
          <Heading size="lg" color="brand.yellow.400" mb={4}>
            {error ?? t("athleteProfile.notFound")}
          </Heading>
          <Button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            colorScheme="orange"
          >
            {t("backToLeaderboard")}
          </Button>
        </Container>
      </Box>
    );
  }

  const levelParam = profile?.doubles_level ?? profile?.level ?? "RX";
  const isDoublesLevel = (level?: string | null) =>
    level === "DOUBLE_RX" || level === "DOUBLE_SCALED" || level === "DOUBLE_BEGINNER";

  const levelLabel = (level?: string | null) => {
    switch (level) {
      case "RX":
      case "DOUBLE_RX":
        return "Rx";
      case "SCALED":
      case "DOUBLE_SCALED":
        return "Scaled";
      case "BEGINNER":
      case "DOUBLE_BEGINNER":
        return "Beginner";
      default:
        return undefined;
    }
  };

  const historyByPhase = (() => {
    const groups = new Map<
      string,
      {
        phaseKey: string;
        phaseName: string;
        competitionYear: number | null;
        slug: string;
        phaseId: number;
        entries: AthleteHistoryEntry[];
      }
    >();
    for (const h of history) {
      const phaseId = h.phase_id ?? 0;
      const slug = h.competition_public_slug ?? "";
      const phaseName = h.phase_name ?? "Stage";
      const key = `${h.competition_id}-${phaseId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          phaseKey: key,
          phaseName,
          competitionYear: h.competition_year ?? null,
          slug,
          phaseId,
          entries: [],
        });
      }
      groups.get(key)!.entries.push(h);
    }
    return Array.from(groups.values());
  })();

  return (
    <Box minH="100vh" bg="brand.background" color="white" py={10}>
      <Container maxW="4xl">
        <HStack mb={6} spacing={3} className="no-print">
          <Button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            variant="ghost"
            size="sm"
          >
            ← {t("backToLeaderboard")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            {t("athleteProfile.print")}
          </Button>
        </HStack>

        <Heading size="xl" color="brand.yellow.400" mb={2}>
          {profile.name}
        </Heading>
        <Stack spacing={1} mb={6} color="gray.300">
          <Text>
            {t("athleteProfile.gender")}: {profile.gender}
          </Text>
          <Text>
            {t("athleteProfile.age")}: {profile.age ?? t("common.emptyDash", { defaultValue: "—" })}
          </Text>
          <Text>
            {t("athleteProfile.levelSingles")}: {profile.level}
          </Text>
          <Text>
            {t("athleteProfile.levelDoubles")}: {profile.doubles_level}
          </Text>
          <Text>
            {t("athleteProfile.eventsParticipated")}: {profile.events_participated}
          </Text>
          <Text>
            {t("athleteProfile.eventWins")}: {profile.event_wins}
          </Text>
        </Stack>

        <Heading size="md" color="brand.yellow.400" mb={4}>
          {t("athleteProfile.history")}
        </Heading>
        {history.length === 0 ? (
          <Text color="gray.400">{t("athleteProfile.noHistory")}</Text>
        ) : (
          <Stack spacing={4}>
            {historyByPhase.map((group) => {
              const bestRank = group.entries
                .map((e) => e.podium_rank ?? null)
                .filter((r): r is number => r !== null)
                .reduce<number | null>((min, r) => (min === null || r < min ? r : min), null);
              const trophy =
                bestRank === 1 ? "🥇" : bestRank === 2 ? "🥈" : bestRank === 3 ? "🥉" : "";
              const path = group.slug
                ? `/home/${group.slug}?phase=${group.phaseId}&level=${levelParam}`
                : "/";
              const label =
                group.competitionYear != null
                  ? `${group.phaseName} (${group.competitionYear})`
                  : group.phaseName;
              return (
                <Box key={group.phaseKey}>
                  <Link
                    as={RouterLink}
                    to={path}
                    color="brand.yellow.400"
                    textDecoration="underline"
                    _hover={{ color: "brand.orange.400" }}
                    fontWeight="medium"
                  >
                    {label}
                    {trophy && (
                      <Box as="span" ml={2} aria-label="podium trophy">
                        {trophy}
                      </Box>
                    )}
                  </Link>
                  <List spacing={1} mt={2} pl={4}>
                    {group.entries.map((h) => (
                      <ListItem key={h.id} display="flex" alignItems="flex-start" gap={2}>
                        <Box as="span" color="brand.yellow.400" mt={1}>
                          •
                        </Box>
                        <Box>
                          <Text color="gray.300" fontSize="sm">
                            {(() => {
                              if (!h.event_name) return h.entry;
                              const parts: string[] = [];
                              if (h.event_description) {
                                parts.push(h.event_description);
                              }
                              if (h.winner_name) {
                                const winnerLine =
                                  t("athleteProfile.winnerPrefix", { defaultValue: "Winner: " }) +
                                  h.winner_name +
                                  (h.winner_result ? ` – ${h.winner_result}` : "");
                                parts.push(winnerLine);
                              }
                              const tooltipText = parts.join("\n");

                              const marker = `"${h.event_name}" Event`;
                              const idx = h.entry.indexOf(marker);
                              if (idx === -1 || !tooltipText) {
                                return h.entry;
                              }
                              const before = h.entry.slice(0, idx);
                              const after = h.entry.slice(idx + marker.length);
                              return (
                                <>
                                  {before}
                                  <Tooltip
                                    hasArrow
                                    placement="top-start"
                                    label={
                                      <Box whiteSpace="pre-line">
                                        {tooltipText}
                                      </Box>
                                    }
                                  >
                                    <Box
                                      as="span"
                                      textDecoration="underline"
                                      cursor="pointer"
                                      color="brand.yellow.400"
                                    >
                                      {`"${h.event_name}" Event`}
                                    </Box>
                                  </Tooltip>
                                  {after}
                                </>
                              );
                            })()}
                          </Text>
                          {/* Participation tags */}
                          {(h.level ?? null) && (
                            <HStack spacing={2} mt={1} flexWrap="wrap">
                              <Tag size="sm" colorScheme="purple">
                                {isDoublesLevel(h.level)
                                  ? t("athleteProfile.tags.doubles")
                                  : t("athleteProfile.tags.singles")}
                              </Tag>
                              {levelLabel(h.level) && (
                                <Tag size="sm" colorScheme="yellow">
                                  {levelLabel(h.level)}
                                </Tag>
                              )}
                              {h.athlete_result && (
                                <Tooltip hasArrow label={h.athlete_result}>
                                  <Tag size="sm" colorScheme="teal" cursor="pointer">
                                    {t("athleteProfile.tags.result")}
                                  </Tag>
                                </Tooltip>
                              )}
                            </HStack>
                          )}
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              );
            })}
          </Stack>
        )}
      </Container>
    </Box>
  );
};
