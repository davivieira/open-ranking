import {
  Button,
  HStack,
  Radio,
  RadioGroup,
  Stack,
  useBreakpointValue,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";

export type MobileToggleOption<T extends string> = {
  value: T;
  label: string;
  isDisabled?: boolean;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: MobileToggleOption<T>[];
  ariaLabel?: string;
  desktopDirection?: "row" | "column";
  isDisabled?: boolean;
};

export function MobileToggleGroup<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  desktopDirection = "row",
  isDisabled = false,
}: Props<T>) {
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  if (!isMobile) {
    return (
      <RadioGroup
        value={value}
        onChange={(val) => onChange(val as T)}
        isDisabled={isDisabled}
      >
        <Stack direction={desktopDirection} spacing={4} flexWrap="wrap">
          {options.map((o) => (
            <Radio
              key={o.value}
              value={o.value}
              isDisabled={isDisabled || o.isDisabled}
            >
              {o.label}
            </Radio>
          ))}
        </Stack>
      </RadioGroup>
    );
  }

  return (
    <HStack
      align="flex-start"
      role="radiogroup"
      aria-label={ariaLabel}
      w="full"
    >
      <Wrap spacing={2}>
        {options.map((o) => {
          const isSelected = o.value === value;
          return (
            <WrapItem key={o.value}>
              <Button
                size="sm"
                onClick={() => onChange(o.value)}
                isDisabled={isDisabled || o.isDisabled}
                variant={isSelected ? "solid" : "outline"}
                colorScheme="orange"
                role="radio"
                aria-checked={isSelected}
              >
                {o.label}
              </Button>
            </WrapItem>
          );
        })}
      </Wrap>
    </HStack>
  );
}

