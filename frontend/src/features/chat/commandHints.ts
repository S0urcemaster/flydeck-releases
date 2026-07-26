const commandDescriptions: Record<string, string> = {
  "/status": "Shows Flydeck and agent status.",
  "/model": "Shows the current model and token prices.",
  "/server": "Shows Flydon server details.",
  "/backup": "Copies user and Flydon data to ~/.flydon-backup.",
};

export function getCommandHintLines(input: string) {
  const command = input.trim().toLocaleLowerCase();
  const description = commandDescriptions[command];
  return description
    ? [command.toLocaleUpperCase(), description]
    : ["COMMANDS", ...Object.keys(commandDescriptions)];
}
