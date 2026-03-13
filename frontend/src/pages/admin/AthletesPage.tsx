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
  useDisclosure,
} from "@chakra-ui/react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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

const LEVEL_OPTIONS = [
  { value: "", label: "All levels" },
  { value: "RX", label: "Rx" },
  { value: "SCALED", label: "Scaled" },
  { value: "BEGINNER", label: "Beginner" },
  { value: "DOUBLE_RX", label: "Double Rx" },
  { value: "DOUBLE_SCALED", label: "Double Scaled" },
  { value: "DOUBLE_BEGINNER", label: "Double Beginner" },
];

export const AthletesPage = () => {
  const { accessToken, user } = useAuthStore();
  const isViewer = user?.role === "VIEWER";
  const opts = { token: accessToken };
  const navigate = useNavigate();

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
      <Heading size="lg" color="brand.yellow.400">
        Athlete Profiles
      </Heading>

      {(error || success) && (
        <Alert status={error ? "error" : "success"} borderRadius="md">
          <AlertIcon />
          {error ?? success}
        </Alert>
      )}

      {!isViewer && (
      <Card bg="brand.card">
        <CardBody>
          <Heading size="md" mb={4}>
            New athlete
          </Heading>
          <Stack as="form" onSubmit={handleCreate} spacing={4} maxW="md">
            <FormControl isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                bg="white"
                color="black"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Gender</FormLabel>
              <Select
                value={gender}
                onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
                bg="white"
                color="black"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </Select>
            </FormControl>
            <HStack spacing={4}>
              <FormControl>
                <FormLabel>Level (singles)</FormLabel>
                <Select value={level} onChange={(e) => setLevel(e.target.value)} bg="white" color="black">
                  <option value="RX">Rx</option>
                  <option value="SCALED">Scaled</option>
                  <option value="BEGINNER">Beginner</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Doubles level</FormLabel>
                <Select value={doublesLevel} onChange={(e) => setDoublesLevel(e.target.value)} bg="white" color="black">
                  <option value="DOUBLE_RX">Double Rx</option>
                  <option value="DOUBLE_SCALED">Double Scaled</option>
                  <option value="DOUBLE_BEGINNER">Double Beginner</option>
                </Select>
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel>Birth date</FormLabel>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                bg="white"
                color="black"
              />
            </FormControl>
            <Button type="submit" colorScheme="orange" isLoading={createSubmitting}>
              Create athlete
            </Button>
          </Stack>
        </CardBody>
      </Card>
      )}

      <Card bg="brand.card">
        <CardBody>
          <Heading size="md" mb={4}>
            Athletes
          </Heading>
          <Flex gap={4} mb={4} flexWrap="wrap">
            <FormControl maxW="180px">
              <FormLabel>Filter by gender</FormLabel>
              <Select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                bg="white"
                color="black"
              >
                <option value="">All</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </Select>
            </FormControl>
            <FormControl maxW="200px">
              <FormLabel>Filter by level</FormLabel>
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
          <Table variant="simple" size="md">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Age</Th>
                <Th>Events participated</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {athletes.map((a) => (
                <Tr key={a.id}>
                  <Td>{a.name}</Td>
                  <Td>{a.age ?? "—"}</Td>
                  <Td>{a.events_participated}</Td>
                  <Td>
                    {!isViewer && (
                      <HStack spacing={2}>
                        <Button size="sm" colorScheme="blue" variant="outline" onClick={() => openEdit(a)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => openDelete(a)}
                          isDisabled={a.events_participated > 0}
                          title={a.events_participated > 0 ? "Remove all scores first" : ""}
                        >
                          Delete
                        </Button>
                      </HStack>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {!athletes.length && (
            <Box mt={2} color="gray.400">
              No athletes yet.
            </Box>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={editDisclosure.isOpen} onClose={editDisclosure.onClose}>
        <ModalOverlay />
        <ModalContent bg="brand.card" color="white">
          <ModalHeader>Edit athlete</ModalHeader>
          <form onSubmit={handleEdit}>
            <ModalBody>
              {editError && (
                <Alert status="error" mb={4} borderRadius="md">
                  <AlertIcon />
                  {editError}
                </Alert>
              )}
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    bg="white"
                    color="black"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as "MALE" | "FEMALE")}
                    bg="white"
                    color="black"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </Select>
                </FormControl>
                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel>Level (singles)</FormLabel>
                    <Select value={editLevel} onChange={(e) => setEditLevel(e.target.value)} bg="white" color="black">
                      <option value="RX">Rx</option>
                      <option value="SCALED">Scaled</option>
                      <option value="BEGINNER">Beginner</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Doubles level</FormLabel>
                    <Select value={editDoublesLevel} onChange={(e) => setEditDoublesLevel(e.target.value)} bg="white" color="black">
                      <option value="DOUBLE_RX">Double Rx</option>
                      <option value="DOUBLE_SCALED">Double Scaled</option>
                      <option value="DOUBLE_BEGINNER">Double Beginner</option>
                    </Select>
                  </FormControl>
                </HStack>
                <FormControl>
                  <FormLabel>Birth date</FormLabel>
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
              <Button variant="ghost" mr={3} onClick={editDisclosure.onClose}>
                Cancel
              </Button>
              <Button type="submit" colorScheme="orange" isLoading={editSubmitting}>
                Save
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
            Delete athlete
          </AlertDialogHeader>
          <AlertDialogBody>
            {deleteTarget && (
              <>
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
                {deleteTarget.events_participated > 0 && (
                  <Box mt={2} color="red.300">
                    This athlete has {deleteTarget.events_participated} event(s). Remove all scores first.
                  </Box>
                )}
              </>
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
              isDisabled={deleteTarget ? deleteTarget.events_participated > 0 : false}
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
