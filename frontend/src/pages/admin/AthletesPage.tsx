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
  Select,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { handleApiError } from "../../lib/handleApiError";
import { useAuthStore } from "../../state/authStore";

type AthleteProfile = {
  id: number;
  name: string;
  gender: string;
  level: string;
  doubles_level: string;
  birth_date: string | null;
  age: number | null;
  events_participated: number;
};

export const AthletesPage = () => {
  const { accessToken, user } = useAuthStore();
  const isViewer = user?.role === "VIEWER";
  const opts = { token: accessToken };
  const navigate = useNavigate();
  const { t } = useTranslation("admin");
  const toast = useToast();
  const lastToastRef = useRef<{ status: "success" | "error"; message: string } | null>(null);

  const LEVEL_OPTIONS = [
    { value: "", label: t("athletes.filters.levelOptions.allLevels") },
    { value: "RX", label: t("common.level.rx") },
    { value: "SCALED", label: t("common.level.scaled") },
    { value: "BEGINNER", label: t("common.level.beginner") },
    { value: "DOUBLE_RX", label: t("common.doublesLevel.doubleRx") },
    { value: "DOUBLE_SCALED", label: t("common.doublesLevel.doubleScaled") },
    { value: "DOUBLE_BEGINNER", label: t("common.doublesLevel.doubleBeginner") },
  ];

  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterGender, setFilterGender] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<string>("");

  const [name, setName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [level, setLevel] = useState("RX");
  const [doublesLevel, setDoublesLevel] = useState("DOUBLE_RX");
  const [birthDate, setBirthDate] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const editDisclosure = useDisclosure();
  const deleteDisclosure = useDisclosure();
  const rowActionsDisclosure = useDisclosure();
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const [editTarget, setEditTarget] = useState<AthleteProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState<"MALE" | "FEMALE">("MALE");
  const [editLevel, setEditLevel] = useState("RX");
  const [editDoublesLevel, setEditDoublesLevel] = useState("DOUBLE_RX");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AthleteProfile | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [rowActionsTarget, setRowActionsTarget] = useState<AthleteProfile | null>(null);
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  const loadAthletes = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filterGender) params.set("gender", filterGender);
      if (filterLevel) params.set("level", filterLevel);
      const query = params.toString();
      const data = await apiClient.get<AthleteProfile[]>(`/athletes${query ? `?${query}` : ""}`, opts);
      setAthletes(data);
    } catch (err) {
      handleApiError(err, navigate, setError, "Failed to load athletes");
    }
  }, [filterGender, filterLevel, accessToken, navigate]);

  useEffect(() => {
    loadAthletes();
  }, [loadAthletes]);

  useEffect(() => {
    if (!error) return;
    if (lastToastRef.current?.status === "error" && lastToastRef.current.message === error) return;
    lastToastRef.current = { status: "error", message: error };
    toast({
      title: error,
      status: "error",
      duration: 4000,
      isClosable: true,
      position: "bottom-right",
    });
  }, [error, toast]);

  useEffect(() => {
    if (!success) return;
    if (lastToastRef.current?.status === "success" && lastToastRef.current.message === success) return;
    lastToastRef.current = { status: "success", message: success };
    toast({
      title: success,
      status: "success",
      duration: 3000,
      isClosable: true,
      position: "bottom-right",
    });
  }, [success, toast]);

  useEffect(() => {
    if (!editError) return;
    if (lastToastRef.current?.status === "error" && lastToastRef.current.message === editError) return;
    lastToastRef.current = { status: "error", message: editError };
    toast({
      title: editError,
      status: "error",
      duration: 4000,
      isClosable: true,
      position: "bottom-right",
    });
  }, [editError, toast]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      await apiClient.post(
        "/athletes",
        {
          name: name.trim(),
          gender,
          level,
          doubles_level: doublesLevel,
          birth_date: birthDate || null,
        },
        opts,
      );
      setName("");
      setGender("MALE");
      setLevel("RX");
      setDoublesLevel("DOUBLE_RX");
      setBirthDate("");
      setError(null);
      setSuccess("Athlete created.");
      await loadAthletes();
    } catch (err) {
      setSuccess(null);
      handleApiError(err, navigate, setError, "Failed to create athlete");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEdit = (a: AthleteProfile) => {
    setEditTarget(a);
    setEditName(a.name);
    setEditGender(a.gender as "MALE" | "FEMALE");
    setEditLevel(a.level);
    setEditDoublesLevel(a.doubles_level);
    setEditBirthDate(a.birth_date ?? "");
    setEditError(null);
    editDisclosure.onOpen();
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await apiClient.patch(
        `/athletes/${editTarget.id}`,
        {
          name: editName.trim(),
          gender: editGender,
          level: editLevel,
          doubles_level: editDoublesLevel,
          birth_date: editBirthDate || null,
        },
        opts,
      );
      editDisclosure.onClose();
      setEditTarget(null);
      setError(null);
      setSuccess("Athlete updated.");
      await loadAthletes();
    } catch (err) {
      handleApiError(err, navigate, (msg) => setEditError(msg), "Failed to update");
    } finally {
      setEditSubmitting(false);
    }
  };

  const openDelete = (a: AthleteProfile) => {
    setDeleteTarget(a);
    deleteDisclosure.onOpen();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await apiClient.delete(`/athletes/${deleteTarget.id}`, opts);
      deleteDisclosure.onClose();
      setDeleteTarget(null);
      setError(null);
      setSuccess("Athlete deleted.");
      await loadAthletes();
    } catch (err) {
      setSuccess(null);
      handleApiError(err, navigate, setError, "Failed to delete athlete");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <Stack spacing={8}>
      <Heading size="lg" color="brand.pageTitle">
        {t("athletes.title")}
      </Heading>

      {!isViewer && (
      <Card bg="brand.card">
        <CardBody>
          <Heading size="md" mb={4}>
            {t("athletes.newAthlete.title")}
          </Heading>
          <Stack as="form" onSubmit={handleCreate} spacing={4} maxW="md">
            <FormControl isRequired>
              <FormLabel>{t("athletes.labels.name")}</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                bg="white"
                color="black"
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("athletes.labels.gender")}</FormLabel>
              <Select
                value={gender}
                onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
                bg="white"
                color="black"
              >
                <option value="MALE">{t("common.gender.male")}</option>
                <option value="FEMALE">{t("common.gender.female")}</option>
              </Select>
            </FormControl>
            <HStack spacing={4}>
              <FormControl>
                <FormLabel>{t("athletes.labels.levelSingles")}</FormLabel>
                <Select value={level} onChange={(e) => setLevel(e.target.value)} bg="white" color="black">
                  <option value="RX">{t("common.level.rx")}</option>
                  <option value="SCALED">{t("common.level.scaled")}</option>
                  <option value="BEGINNER">{t("common.level.beginner")}</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>{t("athletes.labels.doublesLevel")}</FormLabel>
                <Select value={doublesLevel} onChange={(e) => setDoublesLevel(e.target.value)} bg="white" color="black">
                  <option value="DOUBLE_RX">{t("common.doublesLevel.doubleRx")}</option>
                  <option value="DOUBLE_SCALED">{t("common.doublesLevel.doubleScaled")}</option>
                  <option value="DOUBLE_BEGINNER">{t("common.doublesLevel.doubleBeginner")}</option>
                </Select>
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel>{t("athletes.labels.birthDate")}</FormLabel>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                bg="white"
                color="black"
              />
            </FormControl>
            <Button type="submit" colorScheme="orange" isLoading={createSubmitting}>
              {t("athletes.actions.create")}
            </Button>
          </Stack>
        </CardBody>
      </Card>
      )}

      <Card bg="brand.card">
        <CardBody>
          <Heading size="md" mb={4}>
            {t("athletes.list.title")}
          </Heading>
          <Flex gap={4} mb={4} flexWrap="wrap">
            <FormControl maxW="180px">
              <FormLabel>{t("athletes.filters.gender")}</FormLabel>
              <Select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                bg="white"
                color="black"
              >
                <option value="">{t("athletes.filters.all")}</option>
                <option value="MALE">{t("common.gender.male")}</option>
                <option value="FEMALE">{t("common.gender.female")}</option>
              </Select>
            </FormControl>
            <FormControl maxW="200px">
              <FormLabel>{t("athletes.filters.level")}</FormLabel>
              <Select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                bg="white"
                color="black"
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Flex>
          <Box overflowX="auto">
            <Table variant="simple" size="md" minW="480px">
              <Thead>
                <Tr>
                  <Th>{t("athletes.table.columns.name")}</Th>
                  <Th>{t("athletes.table.columns.age")}</Th>
                  <Th>{t("athletes.table.columns.eventsParticipated")}</Th>
                  <Th>{t("athletes.table.columns.actions")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {athletes.map((a) => (
                  <Tr
                    key={a.id}
                    cursor={isMobile && !isViewer ? "pointer" : "default"}
                    onClick={
                      isMobile && !isViewer
                        ? () => {
                            setRowActionsTarget(a);
                            rowActionsDisclosure.onOpen();
                          }
                        : undefined
                    }
                  >
                    <Td>{a.name}</Td>
                    <Td>{a.age ?? t("common.emptyDash")}</Td>
                    <Td>{a.events_participated}</Td>
                    <Td>
                      {!isViewer && (
                        <HStack spacing={2}>
                          <Button size="sm" colorScheme="blue" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(a); }}>
                            {t("common.actions.edit")}
                          </Button>
                          <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); openDelete(a); }}
                            isDisabled={a.events_participated > 0}
                            title={a.events_participated > 0 ? t("athletes.actions.removeScoresFirst") : ""}
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
          </Box>
          {!athletes.length && (
            <Box mt={2} color="gray.400">
              {t("athletes.table.empty")}
            </Box>
          )}
        </CardBody>
      </Card>

      {/* Row actions chooser (Edit / Delete) */}
      <Modal
        isOpen={rowActionsDisclosure.isOpen}
        onClose={rowActionsDisclosure.onClose}
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg="brand.card" color="white">
          <ModalHeader>{rowActionsTarget?.name}</ModalHeader>
          <ModalBody>
            <Box>{t("athletes.table.columns.actions")}</Box>
          </ModalBody>
          <ModalFooter>
            {!isViewer && rowActionsTarget && (
              <HStack spacing={3}>
                <Button
                  colorScheme="blue"
                  variant="outline"
                  onClick={() => {
                    rowActionsDisclosure.onClose();
                    openEdit(rowActionsTarget);
                  }}
                >
                  {t("common.actions.edit")}
                </Button>
                <Button
                  colorScheme="red"
                  variant="outline"
                  onClick={() => {
                    rowActionsDisclosure.onClose();
                    openDelete(rowActionsTarget);
                  }}
                  isDisabled={rowActionsTarget.events_participated > 0}
                  title={
                    rowActionsTarget.events_participated > 0
                      ? t("athletes.actions.removeScoresFirst")
                      : ""
                  }
                >
                  {t("common.actions.delete")}
                </Button>
              </HStack>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={editDisclosure.isOpen} onClose={editDisclosure.onClose}>
        <ModalOverlay />
        <ModalContent bg="brand.card" color="white">
          <ModalHeader>{t("athletes.edit.title")}</ModalHeader>
          <form onSubmit={handleEdit}>
            <ModalBody>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t("athletes.labels.name")}</FormLabel>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    bg="white"
                    color="black"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>{t("athletes.labels.gender")}</FormLabel>
                  <Select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as "MALE" | "FEMALE")}
                    bg="white"
                    color="black"
                  >
                    <option value="MALE">{t("common.gender.male")}</option>
                    <option value="FEMALE">{t("common.gender.female")}</option>
                  </Select>
                </FormControl>
                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel>{t("athletes.labels.levelSingles")}</FormLabel>
                    <Select value={editLevel} onChange={(e) => setEditLevel(e.target.value)} bg="white" color="black">
                      <option value="RX">{t("common.level.rx")}</option>
                      <option value="SCALED">{t("common.level.scaled")}</option>
                      <option value="BEGINNER">{t("common.level.beginner")}</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>{t("athletes.labels.doublesLevel")}</FormLabel>
                    <Select value={editDoublesLevel} onChange={(e) => setEditDoublesLevel(e.target.value)} bg="white" color="black">
                      <option value="DOUBLE_RX">{t("common.doublesLevel.doubleRx")}</option>
                      <option value="DOUBLE_SCALED">{t("common.doublesLevel.doubleScaled")}</option>
                      <option value="DOUBLE_BEGINNER">{t("common.doublesLevel.doubleBeginner")}</option>
                    </Select>
                  </FormControl>
                </HStack>
                <FormControl>
                  <FormLabel>{t("athletes.labels.birthDate")}</FormLabel>
                  <Input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    bg="white"
                    color="black"
                  />
                </FormControl>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={editDisclosure.onClose} isDisabled={editSubmitting}>
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" colorScheme="orange" isLoading={editSubmitting} isDisabled={editSubmitting}>
                {t("common.actions.save")}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={deleteDisclosure.isOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={deleteDisclosure.onClose}
      >
        <AlertDialogContent bg="brand.card" color="white">
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            {t("athletes.delete.title")}
          </AlertDialogHeader>
          <AlertDialogBody>
            {deleteTarget && (
              <>
                {t("athletes.delete.confirmPrefix")} <strong>{deleteTarget.name}</strong>?
                {deleteTarget.events_participated > 0 && (
                  <Box mt={2} color="red.300">
                    {t("athletes.delete.blockedHasEvents", { count: deleteTarget.events_participated })}
                  </Box>
                )}
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
              isDisabled={deleteTarget ? deleteTarget.events_participated > 0 : false}
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
