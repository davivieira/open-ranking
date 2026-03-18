import { InfoOutlineIcon } from "@chakra-ui/icons";
import { IconButton, Tooltip, useDisclosure } from "@chakra-ui/react";
import { useCallback } from "react";

type Props = {
  label: string;
  content: string;
};

export function InfoTooltip({ label, content }: Props) {
  const { isOpen, onOpen, onClose, onToggle } = useDisclosure();

  const handleClick = useCallback(() => {
    onToggle();
  }, [onToggle]);

  return (
    <Tooltip
      label={content}
      isOpen={isOpen}
      hasArrow
      placement="top"
      closeOnClick={false}
      openDelay={200}
      maxW="320px"
    >
      <IconButton
        aria-label={label}
        icon={<InfoOutlineIcon boxSize={4} />}
        variant="ghost"
        size="sm"
        color="orange.400"
        _hover={{ color: "orange.500" }}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onFocus={onOpen}
        onBlur={onClose}
        onClick={handleClick}
      />
    </Tooltip>
  );
}

