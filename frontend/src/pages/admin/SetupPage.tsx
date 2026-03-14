import {
  Alert,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertIcon,
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Tag,
  Td,
  Th,
  Thead,
  Textarea,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { Fragment, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { handleApiError } from "../../lib/handleApiError";
import { useAuthStore } from "../../state/authStore";

type Competition = {
  id: number;
  name: string;
  slug: string;
  public_slug: string;
  type: string;
  year: number | null;
  description?: string | null;
  is_active: boolean;
};

type PhaseEventModes = "SINGLES_ONLY" | "DOUBLES_ONLY" | "BOTH";
type EventType = "SINGLES" | "DOUBLES";
type GenderCategory = "MALE" | "FEMALE" | "MIXED";

type Phase = {
  id: number;
  competition_id: number;
  code: string;
  name: string;
  order_index: number;
  event_modes: PhaseEventModes;
};

type Event = {
  id: number;
  phase_id: number;
  code: string;
  name: string;
  description: string | null;
  order_index: number;
  event_type: EventType;
  gender_category: GenderCategory;
  is_finished?: boolean;
};

type PhaseWithEvents = Phase & { events: Event[] };
type CompetitionWithTree = Competition & { phases: PhaseWithEvents[] };

export const SetupPage = () => {
  const { accessToken, user } = useAuthStore();
  const isViewer = user?.role === "VIEWER";
  const toast = useToast();
  const navigate = useNavigate();
  const opts = { token: accessToken };

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [tree, setTree] = useState<CompetitionWithTree[]>([]);
  const [phasesForPhaseForm, setPhasesForPhaseForm] = useState<Phase[]>([]);
  const [phasesForEventForm, setPhasesForEventForm] = useState<Phase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const deleteDisclosure = useDisclosure();
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const finishEventDisclosure = useDisclosure();
  const cancelFinishRef = useRef<HTMLButtonElement>(null);
  const editDisclosure = useDisclosure();
  const [finishEventTarget, setFinishEventTarget] = useState<{
    phaseId: number;
    eventId: number;
    eventName: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "competition" | "phase" | "event";
    id: number;
    name: string;
    competitionId: number;
    phaseId?: number;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<{
    type: "competition" | "phase" | "event";
    competition?: Competition;
    phase?: Phase;
    event?: Event;
    phaseId?: number;
    competitionId?: number;
  } | null>(null);

  const [compName, setCompName] = useState("");
  const [compSlug, setCompSlug] = useState("");
  const [compType, setCompType] = useState("OPEN");
  const [compYear, setCompYear] = useState("");
  const [compDescription, setCompDescription] = useState("");

  const [phaseCompetitionId, setPhaseCompetitionId] = useState<number | "">("");
  const [phaseName, setPhaseName] = useState("");
  const [phaseEventModes, setPhaseEventModes] = useState<PhaseEventModes>("BOTH");

  const [eventPhaseId, setEventPhaseId] = useState<number | "">("");
  const [eventCompetitionId, setEventCompetitionId] = useState<number | "">("");
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("SINGLES");
  const [eventGenderCategory, setEventGenderCategory] = useState<GenderCategory>("MIXED");

  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editType, setEditType] = useState("OPEN");
  const [editYear, setEditYear] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editOrder, setEditOrder] = useState(0);
  const [editEventModes, setEditEventModes] = useState<PhaseEventModes>("BOTH");
  const [editEventType, setEditEventType] = useState<EventType>("SINGLES");
  const [editGenderCategory, setEditGenderCategory] = useState<GenderCategory>("MIXED");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const loadCompetitions = async () => {
    try {
      const data = await apiClient.get<Competition[]>("/competitions", opts);
      setCompetitions(data);
    } catch (err) {
      handleApiError(err, navigate, setError, "Failed to load competitions");
    }
  };

  const loadPhasesForPhaseForm = async (competitionId: number) => {
    try {
      const data = await apiClient.get<Phase[]>(
        `/competitions/${competitionId}/phases`,
        opts,
      );
      setPhasesForPhaseForm(data);
    } catch (e) {
      setPhasesForPhaseForm([]);
    }
  };

  const loadPhasesForEventForm = async (competitionId: number) => {
    try {
      const data = await apiClient.get<Phase[]>(
        `/competitions/${competitionId}/phases`,
        opts,
      );
      setPhasesForEventForm(data);
    } catch (e) {
      setPhasesForEventForm([]);
    }
  };

  const loadFullTree = useCallback(async () => {
    try {
      const comps = await apiClient.get<Competition[]>("/competitions", opts);
      setCompetitions(comps);
      const withPhases: CompetitionWithTree[] = await Promise.all(
        comps.map(async (c) => {
          const phases = await apiClient.get<Phase[]>(
            `/competitions/${c.id}/phases`,
            opts,
          );
          const phasesWithEvents: PhaseWithEvents[] = await Promise.all(
            phases.map(async (p) => {
              const events = await apiClient.get<Event[]>(
                `/phases/${p.id}/events`,
                opts,
              );
              return { ...p, events };
            }),
          );
          return { ...c, phases: phasesWithEvents };
        }),
      );
      setTree(withPhases);
    } catch (err) {
      handleApiError(err, navigate, setError, "Failed to load tree");
    }
  }, [accessToken, navigate]);

  useEffect(() => {
    loadFullTree();
  }, [loadFullTree]);

  useEffect(() => {
    if (typeof phaseCompetitionId === "number") {
      loadPhasesForPhaseForm(phaseCompetitionId);
    } else {
      setPhasesForPhaseForm([]);
    }
  }, [phaseCompetitionId]);

  useEffect(() => {
    if (typeof eventCompetitionId === "number") {
      loadPhasesForEventForm(eventCompetitionId);
    } else {
      setPhasesForEventForm([]);
    }
  }, [eventCompetitionId]);

  // Ensure event type is consistent with the selected phase's allowed modes.
  useEffect(() => {
    if (typeof eventPhaseId !== "number") return;
    const phase = phasesForEventForm.find((p) => p.id === eventPhaseId);
    if (!phase) return;
    if (phase.event_modes === "SINGLES_ONLY" && eventType !== "SINGLES") {
      setEventType("SINGLES");
      if (eventGenderCategory === "MIXED") {
        setEventGenderCategory("MALE");
      }
    } else if (phase.event_modes === "DOUBLES_ONLY" && eventType !== "DOUBLES") {
      setEventType("DOUBLES");
    }
  }, [eventPhaseId, phasesForEventForm, eventType, eventGenderCategory]);

  useEffect(() => {
    if (eventType === "SINGLES" && eventGenderCategory === "MIXED") {
      setEventGenderCategory("MALE");
    }
  }, [eventType, eventGenderCategory]);

  // Keep edit event type in sync with the phase's allowed modes.
  useEffect(() => {
    if (!editTarget || editTarget.type !== "event" || !editTarget.phaseId) return;
    const allPhases: Phase[] = tree.flatMap((c) => c.phases);
    const phase = allPhases.find((p) => p.id === editTarget.phaseId);
    if (!phase) return;
    if (phase.event_modes === "SINGLES_ONLY" && editEventType !== "SINGLES") {
      setEditEventType("SINGLES");
      if (editGenderCategory === "MIXED") {
        setEditGenderCategory("MALE");
      }
    } else if (phase.event_modes === "DOUBLES_ONLY" && editEventType !== "DOUBLES") {
      setEditEventType("DOUBLES");
    }
  }, [editTarget, editEventType, editGenderCategory, tree]);

  useEffect(() => {
    if (editEventType === "SINGLES" && editGenderCategory === "MIXED") {
      setEditGenderCategory("MALE");
    }
  }, [editEventType, editGenderCategory]);

  const handleCreateCompetition = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post(
        "/competitions",
        {
          name: compName,
          slug: compSlug,
          type: compType,
          year: compYear ? parseInt(compYear, 10) : null,
          description: compDescription || null,
          is_active: true,
        },
        opts,
      );
      setSuccess("Competition created.");
      setCompName("");
      setCompSlug("");
      setCompDescription("");
      setCompYear("");
      await loadFullTree();
    } catch (err) {
      handleApiError(err, navigate, setError, "Failed to create competition");
    }
  };

  const handleCreatePhase = async (e: FormEvent) => {
    e.preventDefault();
    if (typeof phaseCompetitionId !== "number") return;
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post(
        `/competitions/${phaseCompetitionId}/phases`,
        { name: phaseName, event_modes: phaseEventModes },
        opts,
      );
      setSuccess("Phase created.");
      setPhaseName("");
      await loadFullTree();
      await loadPhasesForPhaseForm(phaseCompetitionId);
    } catch (err) {
      handleApiError(err, navigate, setError, "Failed to create phase");
    }
  };

  const handleCreateEvent = async (e: FormEvent) => {
    e.preventDefault();
    if (typeof eventPhaseId !== "number") return;
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post(
        `/phases/${eventPhaseId}/events`,
        {
          name: eventName,
          description: eventDescription || null,
          event_type: eventType,
          gender_category: eventType === "SINGLES" && eventGenderCategory === "MIXED" ? "MALE" : eventGenderCategory,
        },
        opts,
      );
      setSuccess("Event created.");
      setEventName("");
      setEventDescription("");
      await loadFullTree();
    } catch (err) {
      handleApiError(err, navigate, setError, "Failed to create event");
    }
  };

  const openDelete = (args: {
    type: "competition" | "phase" | "event";
    id: number;
    name: string;
    competitionId: number;
    phaseId?: number;
  }) => {
    setDeleteTarget(args);
    deleteDisclosure.onOpen();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    try {
      if (deleteTarget.type === "competition") {
        await apiClient.delete(`/competitions/${deleteTarget.id}`, opts);
      } else if (deleteTarget.type === "phase") {
        await apiClient.delete(
          `/competitions/${deleteTarget.competitionId}/phases/${deleteTarget.id}`,
          opts,
        );
      } else if (deleteTarget.type === "event" && deleteTarget.phaseId) {
        await apiClient.delete(
          `/phases/${deleteTarget.phaseId}/events/${deleteTarget.id}`,
          opts,
        );
      }
      deleteDisclosure.onClose();
      setDeleteTarget(null);
      setSuccess("Deleted.");
      await loadFullTree();
    } catch (err) {
      handleApiError(err, navigate, setError, "Failed to delete");
    }
  };

  const confirmFinishEvent = async () => {
    if (!finishEventTarget) return;
    setError(null);
    try {
      await apiClient.post(
        `/phases/${finishEventTarget.phaseId}/events/${finishEventTarget.eventId}/finish`,
        undefined,
        opts,
      );
      finishEventDisclosure.onClose();
      setFinishEventTarget(null);
      setSuccess("Event finished.");
      await loadFullTree();
    } catch (err) {
      handleApiError(err, navigate, setError, "Failed to finish event");
    }
  };

  const openEdit = (args: {
    type: "competition" | "phase" | "event";
    competition?: Competition;
    phase?: Phase;
    event?: Event;
    phaseId?: number;
    competitionId?: number;
  }) => {
    setEditTarget(args);
    setEditError(null);
    if (args.type === "competition" && args.competition) {
      setEditName(args.competition.name);
      setEditSlug(args.competition.slug);
      setEditType(args.competition.type);
      setEditYear(args.competition.year != null ? String(args.competition.year) : "");
      setEditDescription(args.competition.description ?? "");
      setEditIsActive(args.competition.is_active);
    } else if (args.type === "phase" && args.phase) {
      setEditName(args.phase.name);
      setEditOrder(args.phase.order_index);
      setEditEventModes(args.phase.event_modes);
    } else if (args.type === "event" && args.event) {
      setEditName(args.event.name);
      setEditDescription(args.event.description ?? "");
      setEditOrder(args.event.order_index);
      setEditEventType(args.event.event_type);
      setEditGenderCategory(args.event.gender_category);
    }
    editDisclosure.onOpen();
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      if (editTarget.type === "competition" && editTarget.competition) {
        await apiClient.patch(
          `/competitions/${editTarget.competition.id}`,
          {
            name: editName,
            slug: editSlug,
            type: editType,
            year: editYear ? parseInt(editYear, 10) : null,
            description: editDescription || null,
            is_active: editIsActive,
          },
          opts,
        );
      } else if (editTarget.type === "phase" && editTarget.phase && editTarget.competitionId) {
        await apiClient.patch(
          `/competitions/${editTarget.competitionId}/phases/${editTarget.phase.id}`,
          { name: editName, order_index: editOrder, event_modes: editEventModes },
          opts,
        );
      } else if (editTarget.type === "event" && editTarget.event && editTarget.phaseId) {
        await apiClient.patch(
          `/phases/${editTarget.phaseId}/events/${editTarget.event.id}`,
          {
            name: editName,
            description: editDescription || null,
            order_index: editOrder,
            event_type: editEventType,
            gender_category: editEventType === "SINGLES" && editGenderCategory === "MIXED" ? "MALE" : editGenderCategory,
          },
          opts,
        );
      }
      editDisclosure.onClose();
      setEditTarget(null);
      setSuccess("Updated.");
      await loadFullTree();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditSubmitting(false);
    }
  };

  const selectedPhaseForEventForm =
    typeof eventPhaseId === "number"
      ? phasesForEventForm.find((p) => p.id === eventPhaseId)
      : undefined;
  const showEventTypeForCreate =
    selectedPhaseForEventForm && selectedPhaseForEventForm.event_modes === "BOTH";

  const allPhasesForEdit: Phase[] = tree.flatMap((c) => c.phases);
  const editPhaseForEvent =
    editTarget?.type === "event" && editTarget.phaseId
      ? allPhasesForEdit.find((p) => p.id === editTarget.phaseId)
      : undefined;
  const showEventTypeForEdit =
    editTarget?.type === "event" && editPhaseForEvent?.event_modes === "BOTH";

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload.competitions || !Array.isArray(payload.competitions)) {
        setError("Invalid format: expected { competitions: [...] }");
        return;
      }
      const result = await apiClient.post<{
        created_competitions: number;
        created_phases: number;
        created_events: number;
      }>("/admin/import", payload, opts);
      setSuccess(
        `Imported ${result.created_competitions} competition(s), ${result.created_phases} phase(s), ${result.created_events} event(s).`,
      );
      await loadFullTree();
    } catch (err) {
      handleApiError(err, navigate, setError, "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <Stack spacing={8}>
      <Heading size="lg" color="brand.yellow.400">
        Setup – Competitions, Phases, Events
      </Heading>

      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}
      {success && (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          {success}
        </Alert>
      )}

      {!isViewer && (
        <HStack gap={4}>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleImportJson}
          />
          <Button
            size="sm"
            variant="outline"
            isLoading={importing}
            onClick={() => importInputRef.current?.click()}
          >
            Import JSON
          </Button>
        </HStack>
      )}

      {!isViewer && (
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
        <Card bg="brand.card">
          <CardBody>
            <Heading size="md" mb={4}>
              New competition
            </Heading>
            <Stack as="form" onSubmit={handleCreateCompetition} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  bg="white"
                  color="black"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Slug</FormLabel>
                <Input
                  value={compSlug}
                  onChange={(e) => setCompSlug(e.target.value)}
                  bg="white"
                  color="black"
                  placeholder="e.g. open-2026"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  value={compType}
                  onChange={(e) => setCompType(e.target.value)}
                  bg="white"
                  color="black"
                >
                  <option value="OPEN">Open</option>
                  <option value="STRONG_GAMES">Strong Games</option>
                  <option value="OTHER">Other</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Year</FormLabel>
                <Input
                  type="number"
                  value={compYear}
                  onChange={(e) => setCompYear(e.target.value)}
                  bg="white"
                  color="black"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={compDescription}
                  onChange={(e) => setCompDescription(e.target.value)}
                  bg="white"
                  color="black"
                />
              </FormControl>
              <Button type="submit" colorScheme="orange">
                Create competition
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card bg="brand.card">
          <CardBody>
            <Heading size="md" mb={4}>
              New phase
            </Heading>
            <Stack as="form" onSubmit={handleCreatePhase} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Competition</FormLabel>
                <Select
                  value={phaseCompetitionId}
                  onChange={(e) =>
                    setPhaseCompetitionId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  bg="white"
                  color="black"
                >
                  <option value="">Select competition</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                  bg="white"
                  color="black"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Event modes</FormLabel>
                <Select
                  value={phaseEventModes}
                  onChange={(e) => setPhaseEventModes(e.target.value as PhaseEventModes)}
                  bg="white"
                  color="black"
                >
                  <option value="BOTH">Both singles & doubles</option>
                  <option value="SINGLES_ONLY">Singles only</option>
                  <option value="DOUBLES_ONLY">Doubles only</option>
                </Select>
              </FormControl>
              <Button
                type="submit"
                colorScheme="orange"
                isDisabled={phaseCompetitionId === ""}
              >
                Create phase
              </Button>
            </Stack>
          </CardBody>
        </Card>

        <Card bg="brand.card">
          <CardBody>
            <Heading size="md" mb={4}>
              New event
            </Heading>
            <Stack as="form" onSubmit={handleCreateEvent} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Competition</FormLabel>
                <Select
                  value={eventCompetitionId}
                  onChange={(e) => {
                    const v = e.target.value === "" ? "" : Number(e.target.value);
                    setEventCompetitionId(v);
                    setEventPhaseId("");
                  }}
                  bg="white"
                  color="black"
                >
                  <option value="">Select competition</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Phase</FormLabel>
                <Select
                  value={eventPhaseId}
                  onChange={(e) =>
                    setEventPhaseId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  bg="white"
                  color="black"
                >
                  <option value="">Select phase</option>
                  {phasesForEventForm.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} – {p.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  bg="white"
                  color="black"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  bg="white"
                  color="black"
                  rows={3}
                />
              </FormControl>
              <FormControl>
                {showEventTypeForCreate && (
                  <>
                    <FormLabel>Event type</FormLabel>
                    <Select
                      value={eventType}
                      onChange={(e) => {
                        const next = e.target.value as EventType;
                        setEventType(next);
                        if (next === "SINGLES" && eventGenderCategory === "MIXED") {
                          setEventGenderCategory("MALE");
                        }
                      }}
                      bg="white"
                      color="black"
                    >
                      <option value="SINGLES">Singles</option>
                      <option value="DOUBLES">Doubles</option>
                    </Select>
                  </>
                )}
              </FormControl>
              <FormControl>
                <FormLabel>Gender category</FormLabel>
                <Select
                  value={eventType === "SINGLES" && eventGenderCategory === "MIXED" ? "MALE" : eventGenderCategory}
                  onChange={(e) => setEventGenderCategory(e.target.value as GenderCategory)}
                  bg="white"
                  color="black"
                >
                  {eventType === "DOUBLES" && <option value="MIXED">Mixed</option>}
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </Select>
              </FormControl>
              <Button
                type="submit"
                colorScheme="orange"
                isDisabled={eventPhaseId === ""}
              >
                Create event
              </Button>
            </Stack>
          </CardBody>
        </Card>
      </SimpleGrid>
      )}

      <Box maxH="70vh" overflowY="auto">
        <Heading size="md" mb={4}>
          Competitions, stages & events
        </Heading>
        {tree.length === 0 ? (
          <Box color="gray.400">No competitions yet. Create one above.</Box>
        ) : (
          <Table variant="simple" size="sm" bg="brand.card" borderRadius="md">
            <Thead position="sticky" top={0} zIndex={1} bg="whiteAlpha.100">
              <Tr>
                <Th>Type</Th>
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Context</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {tree.map((c) => (
                <Fragment key={`comp-${c.id}`}>
                  <Tr>
                    <Td fontWeight="semibold">Competition</Td>
                    <Td>{c.name}</Td>
                    <Td>{c.slug}</Td>
                    <Td>—</Td>
                    <Td>
                      <HStack gap={2} flexWrap="wrap">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            const url = `${window.location.origin}/home/${c.public_slug}`;
                            void navigator.clipboard.writeText(url);
                            toast({
                              title: "Link copied",
                              description: "Leaderboard link copied to clipboard.",
                              status: "success",
                              duration: 3000,
                              isClosable: true,
                              position: "bottom-right",
                            });
                          }}
                        >
                          Copy leaderboard link
                        </Button>
                        {!isViewer && (
                          <>
                            <Button size="xs" onClick={() => openEdit({ type: "competition", competition: c })}>
                              Edit
                            </Button>
                            <Button
                              size="xs"
                              colorScheme="red"
                              variant="outline"
                              onClick={() =>
                                openDelete({
                                  type: "competition",
                                  id: c.id,
                                  name: c.name,
                                  competitionId: c.id,
                                })
                              }
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                  {c.phases.map((p) => (
                    <Fragment key={`phase-${p.id}`}>
                      <Tr bg="blackAlpha.100">
                        <Td pl={8}>Stage</Td>
                        <Td>{p.name}</Td>
                        <Td>{p.code}</Td>
                        <Td>{c.name}</Td>
                        <Td>
                          <HStack gap={2} flexWrap="wrap">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                const url = `${window.location.origin}/home/${c.public_slug}?phase=${p.id}`;
                                void navigator.clipboard.writeText(url);
                                toast({
                                  title: "Link copied",
                                  description: "Leaderboard link copied to clipboard.",
                                  status: "success",
                                  duration: 3000,
                                  isClosable: true,
                                  position: "bottom-right",
                                });
                              }}
                            >
                              Copy leaderboard link
                            </Button>
                            {!isViewer && (
                              <>
                                <Button
                                  size="xs"
                                  onClick={() =>
                                    openEdit({
                                      type: "phase",
                                      phase: p,
                                      competitionId: c.id,
                                    })
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="xs"
                                  colorScheme="red"
                                  variant="outline"
                                  onClick={() =>
                                    openDelete({
                                      type: "phase",
                                      id: p.id,
                                      name: p.name,
                                      competitionId: c.id,
                                    })
                                  }
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </HStack>
                        </Td>
                      </Tr>
                      {p.events.map((ev) => (
                        <Tr key={`event-${ev.id}`} bg="blackAlpha.50">
                          <Td pl={12}>Event</Td>
                          <Td>
                            {ev.name}
                            <Box as="span" fontSize="xs" color="gray.500" ml={2}>
                              {ev.event_type} / {ev.gender_category}
                            </Box>
                          </Td>
                          <Td>{ev.code}</Td>
                          <Td>{p.name}</Td>
                          <Td>
                            <HStack gap={2} flexWrap="wrap">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  const url = `${window.location.origin}/home/${c.public_slug}?phase=${p.id}&event=${ev.id}`;
                                  void navigator.clipboard.writeText(url);
                                  toast({
                                    title: "Link copied",
                                    description: "Leaderboard link copied to clipboard.",
                                    status: "success",
                                    duration: 3000,
                                    isClosable: true,
                                    position: "bottom-right",
                                  });
                                }}
                              >
                                Copy leaderboard link
                              </Button>
                              {ev.is_finished ? (
                                <Tag size="sm" colorScheme="green">
                                  Finished
                                </Tag>
                              ) : isViewer ? null : (
                                <Button
                                  size="xs"
                                  colorScheme="green"
                                  variant="outline"
                                  onClick={() => {
                                    setFinishEventTarget({
                                      phaseId: p.id,
                                      eventId: ev.id,
                                      eventName: ev.name,
                                    });
                                    finishEventDisclosure.onOpen();
                                  }}
                                >
                                  Finish event
                                </Button>
                              )}
                              {!isViewer && (
                                <>
                                  <Button
                                    size="xs"
                                    onClick={() =>
                                      openEdit({
                                        type: "event",
                                        event: ev,
                                        phaseId: p.id,
                                      })
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="xs"
                                    colorScheme="red"
                                    variant="outline"
                                    onClick={() =>
                                      openDelete({
                                        type: "event",
                                        id: ev.id,
                                        name: ev.name,
                                        competitionId: c.id,
                                        phaseId: p.id,
                                      })
                                    }
                                  >
                                    Delete
                                  </Button>
                                </>
                              )}
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>

      <AlertDialog
        isOpen={deleteDisclosure.isOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={deleteDisclosure.onClose}
      >
        <AlertDialogOverlay />
        <AlertDialogContent>
          <AlertDialogHeader>Delete {deleteTarget?.type}</AlertDialogHeader>
          <AlertDialogBody>
            Delete {deleteTarget?.name}? This cannot be undone.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelDeleteRef} onClick={deleteDisclosure.onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDelete} ml={3}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        isOpen={finishEventDisclosure.isOpen}
        leastDestructiveRef={cancelFinishRef}
        onClose={finishEventDisclosure.onClose}
      >
        <AlertDialogOverlay />
        <AlertDialogContent>
          <AlertDialogHeader>Finish event</AlertDialogHeader>
          <AlertDialogBody>
            Finish &quot;{finishEventTarget?.eventName}&quot;? No more scores can be added after this.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelFinishRef} onClick={finishEventDisclosure.onClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={confirmFinishEvent} ml={3}>
              Finish event
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Modal isOpen={editDisclosure.isOpen} onClose={editDisclosure.onClose}>
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={submitEdit}>
            <ModalHeader>Edit {editTarget?.type}</ModalHeader>
            <ModalBody>
              {editError && (
                <Alert status="error" size="sm" mb={4}>
                  <AlertIcon />
                  {editError}
                </Alert>
              )}
              {editTarget?.type === "competition" && (
                <Stack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Name</FormLabel>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} bg="white" color="black" />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Slug</FormLabel>
                    <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} bg="white" color="black" />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Type</FormLabel>
                    <Select value={editType} onChange={(e) => setEditType(e.target.value)} bg="white" color="black">
                      <option value="OPEN">Open</option>
                      <option value="STRONG_GAMES">Strong Games</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Year</FormLabel>
                    <Input
                      type="number"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      bg="white"
                      color="black"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      bg="white"
                      color="black"
                    />
                  </FormControl>
                </Stack>
              )}
              {(editTarget?.type === "phase" || editTarget?.type === "event") && (
                <Stack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Name</FormLabel>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} bg="white" color="black" />
                  </FormControl>
                  {editTarget?.type === "phase" && (
                    <FormControl>
                      <FormLabel>Event modes</FormLabel>
                      <Select
                        value={editEventModes}
                        onChange={(e) => setEditEventModes(e.target.value as PhaseEventModes)}
                        bg="white"
                        color="black"
                      >
                        <option value="BOTH">Both singles & doubles</option>
                        <option value="SINGLES_ONLY">Singles only</option>
                        <option value="DOUBLES_ONLY">Doubles only</option>
                      </Select>
                    </FormControl>
                  )}
                  {editTarget?.type === "event" && (
                    <>
                      <FormControl>
                        <FormLabel>Description</FormLabel>
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          bg="white"
                          color="black"
                          rows={3}
                        />
                      </FormControl>
                      <FormControl>
                        {showEventTypeForEdit && (
                          <>
                            <FormLabel>Event type</FormLabel>
                            <Select
                              value={editEventType}
                              onChange={(e) => {
                                const next = e.target.value as EventType;
                                setEditEventType(next);
                                if (next === "SINGLES" && editGenderCategory === "MIXED") {
                                  setEditGenderCategory("MALE");
                                }
                              }}
                              bg="white"
                              color="black"
                            >
                              <option value="SINGLES">Singles</option>
                              <option value="DOUBLES">Doubles</option>
                            </Select>
                          </>
                        )}
                      </FormControl>
                      <FormControl>
                        <FormLabel>Gender category</FormLabel>
                        <Select
                          value={editEventType === "SINGLES" && editGenderCategory === "MIXED" ? "MALE" : editGenderCategory}
                          onChange={(e) => setEditGenderCategory(e.target.value as GenderCategory)}
                          bg="white"
                          color="black"
                        >
                          {editEventType === "DOUBLES" && <option value="MIXED">Mixed</option>}
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </Select>
                      </FormControl>
                    </>
                  )}
                  <FormControl>
                    <FormLabel>Order index</FormLabel>
                    <NumberInput value={editOrder} min={0} onChange={(_, v) => setEditOrder(v ?? 0)}>
                      <NumberInputField bg="white" color="black" />
                    </NumberInput>
                  </FormControl>
                </Stack>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={editDisclosure.onClose}>
                Cancel
              </Button>
              <Button type="submit" colorScheme="orange" isLoading={editSubmitting}>
                Save
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Stack>
  );
};
