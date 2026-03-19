import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  HStack,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Show,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { FormEvent, useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { InfoTooltip } from "../../components/InfoTooltip";
import { MobileToggleGroup } from "../../components/MobileToggleGroup";
import { handleApiError } from "../../lib/handleApiError";
import { useAuthStore } from "../../state/authStore";
import { useScoresStore, type Score } from "../../state/scoresStore";

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
  const toast = useToast();
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
  const [scoreType, setScoreType] = useState<"time" | "points" | "weight">("time");
  const [timeInput, setTimeInput] = useState("");
  const [pointsInput, setPointsInput] = useState("");
  const [weightInput, setWeightInput] = useState("");

  const deleteDisclosure = useDisclosure();
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const mobileScoreActionsDisclosure = useDisclosure();
  const [mobileScoreActionsTarget, setMobileScoreActionsTarget] = useState<Score | null>(null);
  const editDisclosure = useDisclosure();
  const [editTarget, setEditTarget] = useState<Score | null>(null);
  const [editScoreType, setEditScoreType] = useState<"time" | "points" | "weight">("time");
  const [editTimeInput, setEditTimeInput] = useState("");
  const [editPointsInput, setEditPointsInput] = useState("");
  const [editWeightInput, setEditWeightInput] = useState("");

  const { scores, isLoading, error, fetchScores, addScore, updateScore, deleteScore } = useScoresStore();
  const opts = { token: accessToken };
  const lastToastRef = useRef<{ status: "error" | "success" | "info"; message: string } | null>(null);

  const localizeErrorMessage = (msg: string): string => {
    // Map known backend validation messages to translated strings.
    if (msg === "Athlete already has a score for this event and level") {
      return t("scores.errors.duplicateSingles");
    }
    if (msg === "This pair already has a score for this event and level") {
      return t("scores.errors.duplicatePair");
    }
    if (msg === "An athlete in this pair already has a doubles score for this event and level") {
      return t("scores.errors.athleteAlreadyInDoubles");
    }
    if (msg === "Event is finished; scores cannot be modified") {
      return t("scores.errors.eventFinishedModify");
    }

    // DB-level unique constraint fallback (e.g., Postgres duplicate key message).
    if (/duplicate key value violates unique constraint/i.test(msg)) {
      return t("scores.errors.duplicateGeneric");
    }

    return msg;
  };

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
  const hasCompetitionAndEvent = competitionId !== "" && eventId !== "";
  const eventFinished = selectedEvent?.is_finished === true;
  const isFormEnabled = hasCompetitionAndEvent && !eventFinished;
  const actionsDisabled = isViewer || eventFinished;

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

  // Reset dependent fields whenever competition or event changes.
  useEffect(() => {
    clearForm();
    setMode("existing");
  }, [competitionId, eventId]);

  useEffect(() => {
    const rawMsg = phasesError ?? error;
    if (!rawMsg) return;
    const msg = localizeErrorMessage(rawMsg);
    if (lastToastRef.current?.status === "error" && lastToastRef.current.message === msg) return;
    lastToastRef.current = { status: "error", message: msg };
    toast({
      title: msg,
      status: "error",
      duration: 4000,
      isClosable: true,
      position: "bottom-right",
    });
  }, [phasesError, error, toast, t]);

  useEffect(() => {
    if (!selectedEvent?.is_finished) return;
    const msg = t("scores.info.eventFinished");
    if (lastToastRef.current?.status === "info" && lastToastRef.current.message === msg) return;
    lastToastRef.current = { status: "info", message: msg };
    toast({
      title: msg,
      status: "info",
      duration: 4000,
      isClosable: true,
      position: "bottom-right",
    });
  }, [selectedEvent?.is_finished, toast, t]);

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
    setWeightInput("");
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

  const formatScoreCell = (score: Score) => {
    if (score.time_seconds != null) return formatSeconds(score.time_seconds);
    if (score.reps_points != null) return t("scores.table.values.pointsSuffix", { points: score.reps_points });
    if (score.weight_kg != null) return t("scores.table.values.weightSuffix", { weight: score.weight_kg });
    return t("common.emptyDash");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (competitionId === "" || eventId === "") return;
    if (scoreType === "time") {
      const sec = parseTimeToSeconds(timeInput);
      if (sec === null || sec < 0) return;
    } else if (scoreType === "points") {
      const pts = parseFloat(pointsInput);
      if (!Number.isFinite(pts) || pts < 0) return;
    } else {
      const kg = parseFloat(weightInput);
      if (!Number.isFinite(kg) || kg < 0) return;
    }

    const basePayload: Record<string, unknown> = {
      competition_id: competitionId,
      event_id: eventId,
    };
    if (scoreType === "time") {
      basePayload.time_seconds = parseTimeToSeconds(timeInput);
    } else if (scoreType === "points") {
      basePayload.reps_points = parseFloat(pointsInput);
    } else {
      basePayload.weight_kg = parseFloat(weightInput);
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

    const createdNewAthlete =
      Object.prototype.hasOwnProperty.call(basePayload, "athlete") ||
      Object.prototype.hasOwnProperty.call(basePayload, "partner");

    const result = await addScore(basePayload);
    if (result.ok) {
      if (createdNewAthlete) {
        const nextAthletes: Athlete[] = [];
        const a = result.createdScore.athlete;
        if (a) {
          nextAthletes.push({
            id: a.id,
            name: a.name,
            gender: a.gender,
            level: a.level,
            doubles_level: a.doubles_level,
          });
        }
        const p = result.createdScore.partner;
        if (p) {
          nextAthletes.push({
            id: p.id,
            name: p.name,
            gender: p.gender,
            level: p.level,
            doubles_level: p.doubles_level,
          });
        }

        if (nextAthletes.length > 0) {
          setAllAthletes((prev) => {
            const byId = new Map<number, Athlete>();
            for (const x of prev) byId.set(x.id, x);
            for (const x of nextAthletes) byId.set(x.id, x);
            return Array.from(byId.values()).sort((x, y) => x.name.localeCompare(y.name));
          });
        }
      }
      clearForm();
    }
  };

  const closeEditModal = () => {
    editDisclosure.onClose();
    setEditTarget(null);
  };

  const openEditScore = (score: Score) => {
    setEditTarget(score);
    if (score.time_seconds != null) {
      setEditScoreType("time");
      setEditTimeInput(formatSeconds(score.time_seconds));
      setEditPointsInput("");
      setEditWeightInput("");
    } else if (score.reps_points != null) {
      setEditScoreType("points");
      setEditTimeInput("");
      setEditPointsInput(String(score.reps_points));
      setEditWeightInput("");
    } else {
      setEditScoreType("weight");
      setEditTimeInput("");
      setEditPointsInput("");
      setEditWeightInput(score.weight_kg != null ? String(score.weight_kg) : "");
    }
    editDisclosure.onOpen();
  };

  const handleEditSave = async () => {
    if (!editTarget || eventId === "") return;
    if (editScoreType === "time") {
      const sec = parseTimeToSeconds(editTimeInput);
      if (sec === null || sec < 0) return;
      const ok = await updateScore(editTarget.id, eventId as number, { time_seconds: sec });
      if (ok) closeEditModal();
    } else if (editScoreType === "points") {
      const pts = parseFloat(editPointsInput);
      if (!Number.isFinite(pts) || pts < 0) return;
      const ok = await updateScore(editTarget.id, eventId as number, { reps_points: pts });
      if (ok) closeEditModal();
    } else {
      const kg = parseFloat(editWeightInput);
      if (!Number.isFinite(kg) || kg < 0) return;
      const ok = await updateScore(editTarget.id, eventId as number, { weight_kg: kg });
      if (ok) closeEditModal();
    }
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
      <Flex align="center" gap={3}>
        <Heading size="lg" color="brand.pageTitle">
          {t("scores.title")}
        </Heading>
        <InfoTooltip label={t("scores.help.resultsTutorial.ariaLabel")} content={t("scores.help.resultsTutorial.text")} />
      </Flex>

      {!isViewer && (
      <Card bg="brand.card">
        <CardBody>
          <Stack spacing={6} as="form" onSubmit={handleSubmit}>
            <Flex gap={4} flexWrap="wrap">
              <FormControl maxW="280px">
                <FormLabel display="flex" alignItems="center" gap={2} minH="32px">
                  {t("scores.labels.competition")}
                  <Box as="span" color="red.400" fontWeight="bold" display="inline-block" lineHeight="1">
                    *
                  </Box>
                </FormLabel>
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
              <FormControl maxW="320px">
                <FormLabel display="flex" alignItems="center" gap={2} minH="32px">
                  {t("scores.labels.event")}
                  <Box as="span" color="red.400" fontWeight="bold" display="inline-block" lineHeight="1">
                    *
                  </Box>
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
              <FormLabel>{t("scores.entryMode.label")}</FormLabel>
              <MobileToggleGroup
                ariaLabel={t("scores.entryMode.label")}
                value={mode}
                onChange={(val) => setMode(val)}
                isDisabled={!isFormEnabled}
                options={
                  isDoubles
                    ? [
                        {
                          value: "existing",
                          label: t("scores.entryMode.options.doubles.bothExisting"),
                        },
                        {
                          value: "new-athlete-existing-partner",
                          label: t("scores.entryMode.options.doubles.newAthleteExistingPartner"),
                        },
                        {
                          value: "existing-athlete-new-partner",
                          label: t("scores.entryMode.options.doubles.existingAthleteNewPartner"),
                        },
                        { value: "new", label: t("scores.entryMode.options.doubles.bothNew") },
                      ]
                    : [
                        {
                          value: "existing",
                          label: t("scores.entryMode.options.singles.existingAthlete"),
                        },
                        { value: "new", label: t("scores.entryMode.options.singles.newAthlete") },
                      ]
                }
              />
            </FormControl>

            {mode === "existing" && (
              <Flex gap={4} flexWrap="wrap" align="flex-start">
                <FormControl maxW="320px">
                  <FormLabel display="flex" alignItems="center" gap={2} minH="32px">
                    {isDoubles ? t("scores.labels.athlete1") : t("scores.labels.athlete")}
                    <Box as="span" color="red.400" fontWeight="bold" display="inline-block" lineHeight="1">
                      *
                    </Box>
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
                    isDisabled={!isFormEnabled}
                  >
                    {athletes.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.name} ({a.level})
                      </option>
                    ))}
                  </Select>
                </FormControl>
                {isDoubles && (
                  <FormControl maxW="320px">
                    <FormLabel display="flex" alignItems="center" gap={2} minH="32px">
                      {t("scores.labels.athlete2")}
                      <Box as="span" color="red.400" fontWeight="bold" display="inline-block" lineHeight="1">
                        *
                      </Box>
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
                      isDisabled={!isFormEnabled}
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
                <Box fontWeight="medium">
                  {isDoubles && mode === "new-athlete-existing-partner"
                    ? t("scores.newAthlete.sectionTitleDoublesAthlete1")
                    : t("scores.newAthlete.sectionTitle")}
                </Box>
                <FormControl isRequired isDisabled={!isFormEnabled}>
                  <FormLabel>{t("scores.newAthlete.labels.name")}</FormLabel>
                  <Input value={athleteName} onChange={(e) => setAthleteName(e.target.value)} bg="white" color="black" />
                </FormControl>
                <FormControl isDisabled={!isFormEnabled}>
                  <FormLabel>{t("scores.newAthlete.labels.gender")}</FormLabel>
                  <Select value={athleteGender} onChange={(e) => setAthleteGender(e.target.value as "MALE" | "FEMALE")} bg="white" color="black">
                    <option value="MALE">{t("common.gender.male")}</option>
                    <option value="FEMALE">{t("common.gender.female")}</option>
                  </Select>
                </FormControl>
                <Flex gap={4} flexWrap="wrap">
                  <FormControl maxW="180px" isDisabled={!isFormEnabled}>
                    <FormLabel>{t("scores.newAthlete.labels.levelSingles")}</FormLabel>
                    <Select value={athleteLevel} onChange={(e) => setAthleteLevel(e.target.value)} bg="white" color="black">
                      <option value="RX">{t("common.level.rx")}</option>
                      <option value="SCALED">{t("common.level.scaled")}</option>
                      <option value="BEGINNER">{t("common.level.beginner")}</option>
                    </Select>
                  </FormControl>
                  <FormControl maxW="180px" isDisabled={!isFormEnabled}>
                    <FormLabel>{t("scores.newAthlete.labels.doublesLevel")}</FormLabel>
                    <Select value={athleteDoublesLevel} onChange={(e) => setAthleteDoublesLevel(e.target.value)} bg="white" color="black">
                      <option value="DOUBLE_RX">{t("common.doublesLevel.doubleRx")}</option>
                      <option value="DOUBLE_SCALED">{t("common.doublesLevel.doubleScaled")}</option>
                      <option value="DOUBLE_BEGINNER">{t("common.doublesLevel.doubleBeginner")}</option>
                    </Select>
                  </FormControl>
                  <FormControl maxW="180px" isDisabled={!isFormEnabled}>
                    <FormLabel>{t("scores.newAthlete.labels.birthDate")}</FormLabel>
                    <Input type="date" value={athleteBirthDate} onChange={(e) => setAthleteBirthDate(e.target.value)} bg="white" color="black" />
                  </FormControl>
                </Flex>
                <FormControl isDisabled={!isFormEnabled}>
                  <FormLabel>{t("scores.newAthlete.labels.historyEntries")}</FormLabel>
                  <Input value={historyEntries} onChange={(e) => setHistoryEntries(e.target.value)} bg="white" color="black" />
                </FormControl>
                {isDoubles && mode === "new-athlete-existing-partner" && (
                  <FormControl isRequired maxW="320px" isDisabled={!isFormEnabled}>
                    <FormLabel>{t("scores.newAthlete.labels.partnerExisting")}</FormLabel>
                    <Select
                      value={partnerId}
                      onChange={(e) => setPartnerId(e.target.value)}
                      bg="white"
                      color="black"
                      placeholder={t("scores.placeholders.selectPartner")}
                    >
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
                  <FormControl isRequired maxW="320px" isDisabled={!isFormEnabled}>
                    <FormLabel>{t("scores.newPartner.labels.athlete1Existing")}</FormLabel>
                    <Select
                      value={athleteId}
                      onChange={(e) => setAthleteId(e.target.value)}
                      bg="white"
                      color="black"
                      placeholder={t("scores.placeholders.selectAthlete")}
                    >
                      {athletes.map((a) => (
                        <option key={a.id} value={String(a.id)}>{a.name}</option>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <Box fontWeight="medium">{t("scores.newPartner.sectionTitle")}</Box>
                <FormControl isRequired isDisabled={!isFormEnabled}>
                  <FormLabel>{t("scores.newPartner.labels.name")}</FormLabel>
                  <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} bg="white" color="black" />
                </FormControl>
                <FormControl isDisabled={!isFormEnabled}>
                  <FormLabel>{t("scores.newPartner.labels.gender")}</FormLabel>
                  <Select value={partnerGender} onChange={(e) => setPartnerGender(e.target.value as "MALE" | "FEMALE")} bg="white" color="black">
                    <option value="MALE">{t("common.gender.male")}</option>
                    <option value="FEMALE">{t("common.gender.female")}</option>
                  </Select>
                </FormControl>
                <Flex gap={4} flexWrap="wrap">
                  <FormControl maxW="180px" isDisabled={!isFormEnabled}>
                    <FormLabel>{t("scores.newPartner.labels.levelSingles")}</FormLabel>
                    <Select value={partnerLevel} onChange={(e) => setPartnerLevel(e.target.value)} bg="white" color="black">
                      <option value="RX">{t("common.level.rx")}</option>
                      <option value="SCALED">{t("common.level.scaled")}</option>
                      <option value="BEGINNER">{t("common.level.beginner")}</option>
                    </Select>
                  </FormControl>
                  <FormControl maxW="180px" isDisabled={!isFormEnabled}>
                    <FormLabel>{t("scores.newPartner.labels.doublesLevel")}</FormLabel>
                    <Select value={partnerDoublesLevel} onChange={(e) => setPartnerDoublesLevel(e.target.value)} bg="white" color="black">
                      <option value="DOUBLE_RX">{t("common.doublesLevel.doubleRx")}</option>
                      <option value="DOUBLE_SCALED">{t("common.doublesLevel.doubleScaled")}</option>
                      <option value="DOUBLE_BEGINNER">{t("common.doublesLevel.doubleBeginner")}</option>
                    </Select>
                  </FormControl>
                  <FormControl maxW="180px" isDisabled={!isFormEnabled}>
                    <FormLabel>{t("scores.newPartner.labels.birthDate")}</FormLabel>
                    <Input type="date" value={partnerBirthDate} onChange={(e) => setPartnerBirthDate(e.target.value)} bg="white" color="black" />
                  </FormControl>
                </Flex>
              </Stack>
            )}

            <FormControl isDisabled={!isFormEnabled}>
              <FormLabel display="flex" alignItems="center" gap={2} minH="32px">
                {t("scores.labels.result")}
                <Box as="span" color="red.400" fontWeight="bold" display="inline-block" lineHeight="1">
                  *
                </Box>
                <InfoTooltip
                  label={t("scores.help.result.ariaLabel")}
                  content={t("scores.help.result.text")}
                />
              </FormLabel>
              <Box mb={3}>
                <MobileToggleGroup
                  ariaLabel={t("scores.labels.result")}
                  value={scoreType}
                  onChange={(v) => setScoreType(v)}
                  isDisabled={!isFormEnabled}
                  options={[
                    { value: "time", label: t("scores.resultOptions.finishedTime") },
                    { value: "points", label: t("scores.resultOptions.didntFinishPoints") },
                    { value: "weight", label: t("scores.resultOptions.weightLoad") },
                  ]}
                />
              </Box>
              {scoreType === "time" ? (
                <FormControl isRequired>
                  <FormLabel>{t("scores.labels.time")}</FormLabel>
                  <Input
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    placeholder={t("scores.placeholders.time")}
                    bg="white"
                    color="black"
                    isDisabled={!isFormEnabled}
                  />
                </FormControl>
              ) : scoreType === "points" ? (
                <FormControl isRequired>
                  <FormLabel>{t("scores.labels.points")}</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    value={pointsInput}
                    onChange={(e) => setPointsInput(e.target.value)}
                    bg="white"
                    color="black"
                    isDisabled={!isFormEnabled}
                  />
                </FormControl>
              ) : (
                <FormControl isRequired>
                  <FormLabel>{t("scores.labels.weightKg")}</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    bg="white"
                    color="black"
                    isDisabled={!isFormEnabled}
                  />
                </FormControl>
              )}
            </FormControl>

            <Button
              type="submit"
              colorScheme="orange"
              isLoading={isLoading}
              loadingText={t("scores.actions.saving")}
              alignSelf="flex-start"
              isDisabled={
                eventFinished ||
                competitionId === "" ||
                eventId === "" ||
                (scoreType === "time"
                  ? parseTimeToSeconds(timeInput) == null
                  : scoreType === "points"
                    ? !pointsInput.trim() || !Number.isFinite(parseFloat(pointsInput))
                    : !weightInput.trim() || !Number.isFinite(parseFloat(weightInput))) ||
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
          {t("scores.table.title")}
        </Heading>
        <Show above="md">
          <Table variant="simple" size="md">
            <Thead position="sticky" top={0} zIndex={1} bg="whiteAlpha.100">
              <Tr>
                <Th>{t("scores.table.columns.rank")}</Th>
                <Th>{t("scores.table.columns.athlete")}</Th>
                <Th>{t("scores.table.columns.level")}</Th>
                <Th>{t("scores.table.columns.timeOrPoints")}</Th>
                <Th isNumeric>{t("scores.table.columns.points")}</Th>
                <Th>{t("scores.table.columns.actions")}</Th>
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
                  <Td>{formatScoreCell(score)}</Td>
                  <Td isNumeric>{score.points_awarded ?? "-"}</Td>
                  <Td>
                    {!isViewer && (
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          variant="outline"
                          onClick={() => openEditScore(score)}
                          isDisabled={actionsDisabled}
                        >
                          {t("scores.actions.editResult")}
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => openDelete(score)}
                          isDisabled={actionsDisabled}
                        >
                          {t("common.actions.delete")}
                        </Button>
                      </HStack>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Show>
        <Show below="md">
          <Table variant="simple" size="md">
            <Thead position="sticky" top={0} zIndex={1} bg="whiteAlpha.100">
              <Tr>
                <Th>{t("scores.table.columns.athlete")}</Th>
                <Th>{t("scores.table.columns.timeOrPoints")}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {scores.map((score) => (
                <Tr
                  key={score.id}
                  cursor={!actionsDisabled ? "pointer" : "default"}
                  onClick={() => {
                    if (actionsDisabled) return;
                    setMobileScoreActionsTarget(score);
                    mobileScoreActionsDisclosure.onOpen();
                  }}
                >
                  <Td>
                    {score.athlete.name}
                    {score.partner ? ` / ${score.partner.name}` : ""}
                  </Td>
                  <Td>{formatScoreCell(score)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Show>
        {!scores.length && !isLoading && (
          <Box mt={2} color="gray.400">
            {t("scores.table.empty")}
          </Box>
        )}
      </Box>

      <Modal
        isOpen={mobileScoreActionsDisclosure.isOpen}
        onClose={mobileScoreActionsDisclosure.onClose}
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg="brand.card" color="white">
          <ModalHeader>
            {mobileScoreActionsTarget
              ? mobileScoreActionsTarget.partner
                ? `${mobileScoreActionsTarget.athlete.name} / ${mobileScoreActionsTarget.partner.name}`
                : mobileScoreActionsTarget.athlete.name
              : ""}
          </ModalHeader>
          <ModalBody>{t("scores.table.columns.actions")}</ModalBody>
          <ModalFooter>
            {!isViewer && mobileScoreActionsTarget && (
              <HStack spacing={3} w="full" justify="flex-end">
                <Button
                  colorScheme="blue"
                  variant="outline"
                  isDisabled={actionsDisabled}
                  onClick={() => {
                    const target = mobileScoreActionsTarget;
                    mobileScoreActionsDisclosure.onClose();
                    if (target) openEditScore(target);
                  }}
                >
                  {t("scores.actions.editResult")}
                </Button>
                <Button
                  colorScheme="red"
                  variant="outline"
                  isDisabled={actionsDisabled}
                  onClick={() => {
                    const target = mobileScoreActionsTarget;
                    mobileScoreActionsDisclosure.onClose();
                    if (target) openDelete(target);
                  }}
                >
                  {t("common.actions.delete")}
                </Button>
              </HStack>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={editDisclosure.isOpen} onClose={closeEditModal} isCentered size="md">
        <ModalOverlay />
        <ModalContent bg="brand.card" color="white">
          <ModalHeader>{t("scores.editDialog.title")}</ModalHeader>
          <ModalBody>
            {editTarget && (
              <Stack spacing={4}>
                <Box fontWeight="medium">
                  {editTarget.partner
                    ? `${editTarget.athlete.name} / ${editTarget.partner.name}`
                    : editTarget.athlete.name}
                </Box>
                <FormControl>
                  <FormLabel display="flex" alignItems="center" gap={2} minH="32px">
                    {t("scores.labels.result")}
                    <InfoTooltip
                      label={t("scores.help.result.ariaLabel")}
                      content={t("scores.help.result.text")}
                    />
                  </FormLabel>
                  <Box mb={3}>
                    <MobileToggleGroup
                      ariaLabel={t("scores.labels.result")}
                      value={editScoreType}
                      onChange={(v) => setEditScoreType(v)}
                      options={[
                        { value: "time", label: t("scores.resultOptions.finishedTime") },
                        { value: "points", label: t("scores.resultOptions.didntFinishPoints") },
                        { value: "weight", label: t("scores.resultOptions.weightLoad") },
                      ]}
                    />
                  </Box>
                  {editScoreType === "time" ? (
                    <FormControl isRequired>
                      <FormLabel>{t("scores.labels.time")}</FormLabel>
                      <Input
                        value={editTimeInput}
                        onChange={(e) => setEditTimeInput(e.target.value)}
                        placeholder={t("scores.placeholders.time")}
                        bg="white"
                        color="black"
                      />
                    </FormControl>
                  ) : editScoreType === "points" ? (
                    <FormControl isRequired>
                      <FormLabel>{t("scores.labels.points")}</FormLabel>
                      <Input
                        type="number"
                        min={0}
                        value={editPointsInput}
                        onChange={(e) => setEditPointsInput(e.target.value)}
                        bg="white"
                        color="black"
                      />
                    </FormControl>
                  ) : (
                    <FormControl isRequired>
                      <FormLabel>{t("scores.labels.weightKg")}</FormLabel>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={editWeightInput}
                        onChange={(e) => setEditWeightInput(e.target.value)}
                        bg="white"
                        color="black"
                      />
                    </FormControl>
                  )}
                </FormControl>
              </Stack>
            )}
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={closeEditModal}>
              {t("common.actions.cancel")}
            </Button>
            <Button
              colorScheme="orange"
              onClick={() => void handleEditSave()}
              isLoading={isLoading}
              loadingText={t("scores.actions.saving")}
              isDisabled={
                !editTarget ||
                (editScoreType === "time"
                  ? parseTimeToSeconds(editTimeInput) == null
                  : editScoreType === "points"
                    ? !editPointsInput.trim() || !Number.isFinite(parseFloat(editPointsInput))
                    : !editWeightInput.trim() || !Number.isFinite(parseFloat(editWeightInput)))
              }
            >
              {t("common.actions.save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={deleteDisclosure.isOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={deleteDisclosure.onClose}
      >
        <AlertDialogContent bg="brand.card" color="white">
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            {t("scores.deleteDialog.title")}
          </AlertDialogHeader>
          <AlertDialogBody>
            {deleteTarget && (
              <>
                {t("scores.deleteDialog.bodyPrefix")} <strong>{deleteTarget.label}</strong>?
              </>
            )}
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelDeleteRef} onClick={deleteDisclosure.onClose}>
              {t("common.actions.cancel")}
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDelete}
              isLoading={deleteSubmitting}
              ml={3}
            >
              {t("common.actions.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Stack>
  );
};

