import {
  Alert,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import { FormEvent, useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { InfoTooltip } from "../../components/InfoTooltip";
import { handleApiError } from "../../lib/handleApiError";
import { useAuthStore } from "../../state/authStore";
import { useScoresStore } from "../../state/scoresStore";

type Competition = { id: number; name: string; slug: string; type: string };
type Phase = { id: number; competition_id: number; code: string; name: string; order_index: number };
type Event = {
  id: number;
  phase_id: number;
  code: string;
  name: string;
  description: string | null;
  order_index: number;
  event_type: "SINGLES" | "DOUBLES";
  gender_category: "MALE" | "FEMALE" | "MIXED";
  is_finished?: boolean;
};
type Athlete = { id: number; name: string; gender: string; level: string; doubles_level: string };

export const ScoresPage = () => {
  const { accessToken, user } = useAuthStore();
  const isViewer = user?.role === "VIEWER";
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [phasesWithEvents, setPhasesWithEvents] = useState<{ phase: Phase; events: Event[] }[]>([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [phasesError, setPhasesError] = useState<string | null>(null);
  const [competitionId, setCompetitionId] = useState<number | "">("");
  const [eventId, setEventId] = useState<number | "">("");
  const [mode, setMode] = useState<"existing" | "new" | "new-athlete-existing-partner" | "existing-athlete-new-partner">("existing");

  const [allAthletes, setAllAthletes] = useState<Athlete[]>([]);
  const [athleteId, setAthleteId] = useState<string>("");
  const [athleteName, setAthleteName] = useState("");
  const [athleteGender, setAthleteGender] = useState<"MALE" | "FEMALE">("MALE");
  const [athleteLevel, setAthleteLevel] = useState("RX");
  const [athleteDoublesLevel, setAthleteDoublesLevel] = useState("DOUBLE_RX");
  const [athleteBirthDate, setAthleteBirthDate] = useState("");
  const [historyEntries, setHistoryEntries] = useState("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerGender, setPartnerGender] = useState<"MALE" | "FEMALE">("MALE");
  const [partnerLevel, setPartnerLevel] = useState("RX");
  const [partnerDoublesLevel, setPartnerDoublesLevel] = useState("DOUBLE_RX");
  const [partnerBirthDate, setPartnerBirthDate] = useState("");
  const [scoreType, setScoreType] = useState<"time" | "points">("time");
  const [timeInput, setTimeInput] = useState("");
  const [pointsInput, setPointsInput] = useState("");

  const deleteDisclosure = useDisclosure();
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const { scores, isLoading, error, fetchScores, addScore, deleteScore } = useScoresStore();
  const opts = { token: accessToken };

  useEffect(() => {
    apiClient
      .get<Competition[]>("/competitions", opts)
      .then(setCompetitions)
      .catch((err) => {
        handleApiError(err, navigate, () => undefined, "Failed to load competitions");
        setCompetitions([]);
      });
    apiClient
      .get<Athlete[]>("/athletes", opts)
      .then(setAllAthletes)
      .catch((err) => {
        handleApiError(err, navigate, () => undefined, "Failed to load athletes");
        setAllAthletes([]);
      });
  }, [accessToken, navigate]);

  useEffect(() => {
    if (competitionId === "") {
      setPhasesWithEvents([]);
      setPhasesLoading(false);
      setPhasesError(null);
      setEventId("");
      return;
    }
    let cancelled = false;
    setPhasesLoading(true);
    setPhasesError(null);
    apiClient
      .get<Phase[]>(`/competitions/${competitionId}/phases`, opts)
      .then(async (phases) => {
        if (cancelled) return;
        const withEvents: { phase: Phase; events: Event[] }[] = await Promise.all(
          phases.map(async (phase) => {
            const events = await apiClient.get<Event[]>(`/phases/${phase.id}/events`, opts);
            return { phase, events };
          }),
        );
        if (cancelled) return;
        setPhasesWithEvents(withEvents);
        setEventId("");
      })
      .catch((err) => {
        if (!cancelled) {
          setPhasesWithEvents([]);
          handleApiError(
            err,
            navigate,
            setPhasesError,
            "Failed to load stages/events",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPhasesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId, accessToken]);

  const eventOptions = phasesWithEvents.flatMap(
    ({ phase, events }: { phase: Phase; events: Event[] }) =>
      events.map((ev: Event) => ({ phase, ev })),
  );
  const selectedEvent = eventOptions.find(({ ev }) => ev.id === eventId)?.ev;
  const phaseId = selectedEvent?.phase_id ?? null;
  const isDoubles = selectedEvent?.event_type === "DOUBLES";

  const athletes = selectedEvent?.gender_category === "MIXED"
    ? allAthletes
    : allAthletes.filter((a) => a.gender === selectedEvent?.gender_category);

  useEffect(() => {
    if (typeof eventId === "number" && eventId > 0) {
      fetchScores(eventId);
    }
  }, [eventId, fetchScores]);

  useEffect(() => {
    if (selectedEvent) {
      setMode("existing");
    }
  }, [selectedEvent?.id]);

  const buildAthletePayload = (name: string, gender: "MALE" | "FEMALE", level: string, doublesLevel: string, birthDate: string, history: string) => ({
    name,
    gender,
    level,
    doubles_level: doublesLevel,
    birth_date: birthDate || null,
    history_entries: history ? history.split(",").map((s) => s.trim()) : [],
  });

  const clearForm = () => {
    setAthleteId("");
    setAthleteName("");
    setAthleteGender("MALE");
    setAthleteLevel("RX");
    setAthleteDoublesLevel("DOUBLE_RX");
    setAthleteBirthDate("");
    setHistoryEntries("");
    setPartnerId("");
    setPartnerName("");
    setPartnerGender("MALE");
    setPartnerLevel("RX");
    setPartnerDoublesLevel("DOUBLE_RX");
    setPartnerBirthDate("");
    setScoreType("time");
    setTimeInput("");
    setPointsInput("");
  };

  const parseTimeToSeconds = (s: string): number | null => {
    const trimmed = s.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(":");
    if (parts.length === 1) {
      const n = parseFloat(parts[0]);
      return Number.isFinite(n) ? n : null;
    }
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const sec = parseFloat(parts[1]);
      if (Number.isFinite(m) && Number.isFinite(sec)) return m * 60 + sec;
    }
    if (parts.length === 3) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const sec = parseFloat(parts[2]);
      if (Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(sec)) return h * 3600 + m * 60 + sec;
    }
    return null;
  };

  const formatSeconds = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = sec % 1;
    const msStr = ms > 0 ? "." + Math.round(ms * 10) : "";
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${msStr}`;
    return `${m}:${String(s).padStart(2, "0")}${msStr}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (competitionId === "" || eventId === "") return;
    if (scoreType === "time") {
      const sec = parseTimeToSeconds(timeInput);
      if (sec === null || sec < 0) return;
    } else {
      const pts = parseFloat(pointsInput);
      if (!Number.isFinite(pts) || pts < 0) return;
    }

    const basePayload: Record<string, unknown> = {
      competition_id: competitionId,
      event_id: eventId,
    };
    if (scoreType === "time") {
      basePayload.time_seconds = parseTimeToSeconds(timeInput);
    } else {
      basePayload.reps_points = parseFloat(pointsInput);
    }
    if (phaseId != null) basePayload.phase_id = phaseId;

    if (isDoubles) {
      if (mode === "existing") {
        basePayload.athlete_id = Number(athleteId);
        basePayload.partner_id = Number(partnerId);
      } else if (mode === "new-athlete-existing-partner") {
        basePayload.athlete = buildAthletePayload(athleteName, athleteGender, athleteLevel, athleteDoublesLevel, athleteBirthDate, historyEntries);
        basePayload.partner_id = Number(partnerId);
      } else if (mode === "existing-athlete-new-partner") {
        basePayload.athlete_id = Number(athleteId);
        basePayload.partner = buildAthletePayload(partnerName, partnerGender, partnerLevel, partnerDoublesLevel, partnerBirthDate, "");
      } else {
        basePayload.athlete = buildAthletePayload(athleteName, athleteGender, athleteLevel, athleteDoublesLevel, athleteBirthDate, historyEntries);
        basePayload.partner = buildAthletePayload(partnerName, partnerGender, partnerLevel, partnerDoublesLevel, partnerBirthDate, "");
      }
    } else {
      if (mode === "existing") {
        basePayload.athlete_id = Number(athleteId);
      } else {
        basePayload.athlete = buildAthletePayload(athleteName, athleteGender, athleteLevel, athleteDoublesLevel, athleteBirthDate, historyEntries);
      }
    }

    const ok = await addScore(basePayload);
    if (ok) clearForm();
  };

  const openDelete = (score: { id: number; athlete: { name: string }; partner?: { name: string } | null }) => {
    const label = score.partner
      ? `${score.athlete.name} / ${score.partner.name}`
      : score.athlete.name;
    setDeleteTarget({ id: score.id, label });
    deleteDisclosure.onOpen();
  };

  const handleDelete = async () => {
    if (!deleteTarget || eventId === "") return;
    setDeleteSubmitting(true);
    try {
      const ok = await deleteScore(deleteTarget.id, eventId as number);
      if (ok) {
        deleteDisclosure.onClose();
        setDeleteTarget(null);
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <Stack spacing={8}>
      <Heading size="lg" color="brand.yellow.400">
        {t("scores.title")}
      </Heading>

      {(error || phasesError) && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {phasesError ?? error}
        </Alert>
      )}

      {!isViewer && (
      <Card bg="brand.card">
        <CardBody>
          <Stack spacing={6} as="form" onSubmit={handleSubmit}>
            <Flex gap={4} flexWrap="wrap">
              <FormControl maxW="280px" isRequired>
                <FormLabel>{t("scores.labels.competition")}</FormLabel>
                <Select
                  value={competitionId === "" ? "" : String(competitionId)}
                  onChange={(e) =>
                    setCompetitionId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  bg="white"
                  color="black"
                  placeholder={t("scores.placeholders.selectCompetition")}
                >
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="320px" isRequired>
                <FormLabel display="flex" alignItems="center" gap={2}>
                  {t("scores.labels.event")}
                  <InfoTooltip
                    label={t("scores.help.event.ariaLabel")}
                    content={t("scores.help.event.text")}
                  />
                </FormLabel>
                <Select
                  value={eventId === "" ? "" : String(eventId)}
                  onChange={(e) =>
                    setEventId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  bg="white"
                  color="black"
                  placeholder={
                    phasesLoading
                      ? t("scores.placeholders.loadingStages")
                      : t("scores.placeholders.selectStageEvent")
                  }
                  isDisabled={!competitionId || phasesLoading}
                >
                  {phasesError ? (
                    <option value="" disabled>
                      {t("scores.placeholders.error", { error: phasesError })}
                    </option>
                  ) : eventOptions.length === 0 ? (
                    <option value="" disabled>
                      {phasesLoading ? t("common:loading") : t("scores.placeholders.noEvents")}
                    </option>
                  ) : (
                    eventOptions.map(({ phase, ev }) => (
                      <option key={ev.id} value={String(ev.id)}>
                        {phase.name} – {ev.name} ({ev.gender_category})
                      </option>
                    ))
                  )}
                </Select>
              </FormControl>
            </Flex>

            <FormControl>
              <FormLabel>Entry Mode</FormLabel>
              <RadioGroup
                value={mode}
                onChange={(val) => setMode(val as typeof mode)}
              >
                <Stack direction="row" spacing={4} flexWrap="wrap">
                  {isDoubles ? (
                    <>
                      <Radio value="existing">Both existing</Radio>
                      <Radio value="new-athlete-existing-partner">New athlete + existing partner</Radio>
                      <Radio value="existing-athlete-new-partner">Existing athlete + new partner</Radio>
                      <Radio value="new">Both new</Radio>
                    </>
                  ) : (
                    <>
                      <Radio value="existing">Existing athlete</Radio>
                      <Radio value="new">New athlete</Radio>
                    </>
                  )}
                </Stack>
              </RadioGroup>
            </FormControl>

            {mode === "existing" && (
              <Flex gap={4} flexWrap="wrap" align="flex-start">
                <FormControl isRequired maxW="320px">
                  <FormLabel display="flex" alignItems="center" gap={2}>
                    {isDoubles ? t("scores.labels.athlete1") : t("scores.labels.athlete")}
                    <InfoTooltip
                      label={t("scores.help.athlete.ariaLabel")}
                      content={isDoubles ? t("scores.help.athlete.doubles") : t("scores.help.athlete.singles")}
                    />
                  </FormLabel>
                  <Select
                    value={athleteId}
                    onChange={(e) => setAthleteId(e.target.value)}
                    bg="white"
                    color="black"
                    placeholder={t("scores.placeholders.selectAthlete")}
                  >
                    {athletes.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.name} ({a.level})
                      </option>
                    ))}
                  </Select>
                </FormControl>
                {isDoubles && (
                  <FormControl isRequired maxW="320px">
                    <FormLabel display="flex" alignItems="center" gap={2}>
                      {t("scores.labels.athlete2")}
                      <InfoTooltip
                        label={t("scores.help.athlete.ariaLabel")}
                        content={t("scores.help.athlete.doubles")}
                      />
                    </FormLabel>
                    <Select
                      value={partnerId}
                      onChange={(e) => setPartnerId(e.target.value)}
                      bg="white"
                      color="black"
                      placeholder={t("scores.placeholders.selectPartner")}
                    >
                      {athletes
                        .filter((a) => String(a.id) !== athleteId)
                        .map((a) => (
                          <option key={a.id} value={String(a.id)}>
                            {a.name} ({a.level})
                          </option>
                        ))}
                    </Select>
                  </FormControl>
                )}
              </Flex>
            )}

            {(mode === "new" || mode === "new-athlete-existing-partner") && (
              <Stack spacing={4}>
                <Box fontWeight="medium">{isDoubles && mode === "new-athlete-existing-partner" ? "New Athlete 1" : "New Athlete"}</Box>
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input value={athleteName} onChange={(e) => setAthleteName(e.target.value)} bg="white" color="black" />
                </FormControl>
                <FormControl>
                  <FormLabel>Gender</FormLabel>
                  <Select value={athleteGender} onChange={(e) => setAthleteGender(e.target.value as "MALE" | "FEMALE")} bg="white" color="black">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </Select>
                </FormControl>
                <Flex gap={4} flexWrap="wrap">
                  <FormControl maxW="180px">
                    <FormLabel>Level (singles)</FormLabel>
                    <Select value={athleteLevel} onChange={(e) => setAthleteLevel(e.target.value)} bg="white" color="black">
                      <option value="RX">Rx</option>
                      <option value="SCALED">Scaled</option>
                      <option value="BEGINNER">Beginner</option>
                    </Select>
                  </FormControl>
                  <FormControl maxW="180px">
                    <FormLabel>Doubles level</FormLabel>
                    <Select value={athleteDoublesLevel} onChange={(e) => setAthleteDoublesLevel(e.target.value)} bg="white" color="black">
                      <option value="DOUBLE_RX">Double Rx</option>
                      <option value="DOUBLE_SCALED">Double Scaled</option>
                      <option value="DOUBLE_BEGINNER">Double Beginner</option>
                    </Select>
                  </FormControl>
                  <FormControl maxW="180px">
                    <FormLabel>Birth date</FormLabel>
                    <Input type="date" value={athleteBirthDate} onChange={(e) => setAthleteBirthDate(e.target.value)} bg="white" color="black" />
                  </FormControl>
                </Flex>
                <FormControl>
                  <FormLabel>History entries (comma separated)</FormLabel>
                  <Input value={historyEntries} onChange={(e) => setHistoryEntries(e.target.value)} bg="white" color="black" />
                </FormControl>
                {isDoubles && mode === "new-athlete-existing-partner" && (
                  <FormControl isRequired maxW="320px">
                    <FormLabel>Partner (existing)</FormLabel>
                    <Select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} bg="white" color="black" placeholder="Select partner">
                      {athletes.map((a) => (
                        <option key={a.id} value={String(a.id)}>{a.name}</option>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            )}

            {(mode === "existing-athlete-new-partner" || (mode === "new" && isDoubles)) && (
              <Stack spacing={4}>
                {mode === "existing-athlete-new-partner" && (
                  <FormControl isRequired maxW="320px">
                    <FormLabel>Athlete 1 (existing)</FormLabel>
                    <Select value={athleteId} onChange={(e) => setAthleteId(e.target.value)} bg="white" color="black" placeholder="Select athlete">
                      {athletes.map((a) => (
                        <option key={a.id} value={String(a.id)}>{a.name}</option>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <Box fontWeight="medium">Partner {mode === "new" ? "(new)" : "(new)"}</Box>
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} bg="white" color="black" />
                </FormControl>
                <FormControl>
                  <FormLabel>Gender</FormLabel>
                  <Select value={partnerGender} onChange={(e) => setPartnerGender(e.target.value as "MALE" | "FEMALE")} bg="white" color="black">
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </Select>
                </FormControl>
                <Flex gap={4} flexWrap="wrap">
                  <FormControl maxW="180px">
                    <FormLabel>Level (singles)</FormLabel>
                    <Select value={partnerLevel} onChange={(e) => setPartnerLevel(e.target.value)} bg="white" color="black">
                      <option value="RX">Rx</option>
                      <option value="SCALED">Scaled</option>
                      <option value="BEGINNER">Beginner</option>
                    </Select>
                  </FormControl>
                  <FormControl maxW="180px">
                    <FormLabel>Doubles level</FormLabel>
                    <Select value={partnerDoublesLevel} onChange={(e) => setPartnerDoublesLevel(e.target.value)} bg="white" color="black">
                      <option value="DOUBLE_RX">Double Rx</option>
                      <option value="DOUBLE_SCALED">Double Scaled</option>
                      <option value="DOUBLE_BEGINNER">Double Beginner</option>
                    </Select>
                  </FormControl>
                  <FormControl maxW="180px">
                    <FormLabel>Birth date</FormLabel>
                    <Input type="date" value={partnerBirthDate} onChange={(e) => setPartnerBirthDate(e.target.value)} bg="white" color="black" />
                  </FormControl>
                </Flex>
              </Stack>
            )}

            <FormControl isRequired>
              <FormLabel display="flex" alignItems="center" gap={2}>
                {t("scores.labels.result")}
                <InfoTooltip
                  label={t("scores.help.result.ariaLabel")}
                  content={t("scores.help.result.text")}
                />
              </FormLabel>
              <RadioGroup value={scoreType} onChange={(v) => setScoreType(v as "time" | "points")}>
                <Stack direction="row" spacing={4} mb={3}>
                  <Radio value="time">{t("scores.resultOptions.finishedTime")}</Radio>
                  <Radio value="points">{t("scores.resultOptions.didntFinishPoints")}</Radio>
                </Stack>
              </RadioGroup>
              {scoreType === "time" ? (
                <FormControl isRequired>
                  <FormLabel>{t("scores.labels.time")}</FormLabel>
                  <Input
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    placeholder={t("scores.placeholders.time")}
                    bg="white"
                    color="black"
                  />
                </FormControl>
              ) : (
                <FormControl isRequired>
                  <FormLabel>{t("scores.labels.points")}</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    bg="white"
                    color="black"
                  />
                </FormControl>
              )}
            </FormControl>

            {selectedEvent?.is_finished && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                {t("scores.info.eventFinished")}
              </Alert>
            )}
            <Button
              type="submit"
              colorScheme="orange"
              isLoading={isLoading}
              loadingText="Saving..."
              alignSelf="flex-start"
              isDisabled={
                selectedEvent?.is_finished === true ||
                competitionId === "" ||
                eventId === "" ||
                (scoreType === "time" ? parseTimeToSeconds(timeInput) == null : !pointsInput.trim() || !Number.isFinite(parseFloat(pointsInput))) ||
                (mode === "existing" && (!athleteId || (isDoubles && !partnerId))) ||
                ((mode === "new" || mode === "new-athlete-existing-partner") && !athleteName) ||
                (mode === "new-athlete-existing-partner" && !partnerId) ||
                ((mode === "existing-athlete-new-partner" || (mode === "new" && isDoubles)) && (!partnerName || (mode === "existing-athlete-new-partner" && !athleteId)))
              }
            >
              {t("scores.actions.saveScore")}
            </Button>
          </Stack>
        </CardBody>
      </Card>
      )}

      <Box maxH="70vh" overflowY="auto">
        <Heading size="md" mb={4}>
          Event scores
        </Heading>
        <Table variant="simple" size="md">
            <Thead position="sticky" top={0} zIndex={1} bg="whiteAlpha.100">
              <Tr>
                <Th>Rank</Th>
                <Th>Athlete</Th>
                <Th>Level</Th>
                <Th>Time / Points</Th>
                <Th isNumeric>Points</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
            {scores.map((score) => (
              <Tr key={score.id}>
                <Td>{score.rank_within_level ?? "-"}</Td>
                <Td>
                  {score.athlete.name}
                  {score.partner ? ` / ${score.partner.name}` : ""}
                </Td>
                <Td>{score.level}</Td>
                <Td>
                  {score.time_seconds != null
                    ? formatSeconds(score.time_seconds)
                    : score.reps_points != null
                      ? `${score.reps_points} pts`
                      : "—"}
                </Td>
                <Td isNumeric>{score.points_awarded ?? "-"}</Td>
                <Td>
                  {!isViewer && (
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      onClick={() => openDelete(score)}
                    >
                      Delete
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {!scores.length && !isLoading && (
          <Box mt={2} color="gray.400">
            No scores yet for this event.
          </Box>
        )}
      </Box>

      <AlertDialog
        isOpen={deleteDisclosure.isOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={deleteDisclosure.onClose}
      >
        <AlertDialogContent bg="brand.card" color="white">
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete score
          </AlertDialogHeader>
          <AlertDialogBody>
            {deleteTarget && (
              <>Are you sure you want to delete the score for <strong>{deleteTarget.label}</strong>?</>
            )}
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelDeleteRef} onClick={deleteDisclosure.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDelete}
              isLoading={deleteSubmitting}
              ml={3}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Stack>
  );
};

