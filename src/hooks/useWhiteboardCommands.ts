import { useEffect, useRef, useCallback } from "react";
import { getFastboardInstance } from "@/components/Whiteboard";
import useAppStore from "@/store/useAppStore";

interface WhiteboardCommand {
  action: string;
  params: Record<string, unknown>;
}

const POLL_INTERVAL_MS = 500;

// Actions that require the whiteboard to be open
const DRAWING_ACTIONS = new Set([
  "insert_image",
  "insert_text",
  "clear_board",
]);

// Module-scoped queue for commands that arrive before whiteboard is ready
let pendingCommands: WhiteboardCommand[] = [];

/**
 * Polls the whiteboard commands endpoint and executes them on Fastboard.
 * Polls whenever the agent is active (so it can receive open/close commands).
 * Auto-opens the whiteboard when drawing commands arrive.
 */
const useWhiteboardCommands = (): void => {
  const channelId = useAppStore((state) => state.channelId);
  const isWhiteboardActive = useAppStore((state) => state.isWhiteboardActive);
  const isAgentActive = useAppStore((state) => state.isAgentActive);
  const setWhiteboardActive = useAppStore((state) => state.setWhiteboardActive);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const executeFastboardCommand = useCallback(
    async (command: WhiteboardCommand) => {
      const fastboard = getFastboardInstance();
      if (!fastboard) {
        console.warn("[WhiteboardCommands] No fastboard instance available");
        return;
      }

      console.log(
        "[WhiteboardCommands] Executing:",
        command.action,
        command.params
      );

      try {
        switch (command.action) {
          case "insert_image": {
            const { url, width, height } = command.params as {
              url: string;
              width?: number;
              height?: number;
            };
            if (!url) break;

            const imgWidth = (width as number) ?? 800;
            const imgHeight = (height as number) ?? 600;
            await fastboard.insertImage(url);
            const room = fastboard.manager.mainView;
            if (room) {
              room.moveCamera({ centerX: 0, centerY: 0 });
            }
            console.log(
              `[WhiteboardCommands] Inserted image ${imgWidth}x${imgHeight}`
            );
            break;
          }

          case "insert_text": {
            const { x, y, text } = command.params as {
              x: number;
              y: number;
              text: string;
              fontSize?: number;
            };
            if (!text) break;

            const room = fastboard.manager.mainView;
            if (room) {
              room.insertText(x ?? 100, y ?? 100, text);
            }
            console.log(
              `[WhiteboardCommands] Inserted text: "${text}" at (${x}, ${y})`
            );
            break;
          }

          case "clear_board": {
            fastboard.cleanCurrentScene();
            console.log("[WhiteboardCommands] Cleared board");
            break;
          }


          default:
            console.warn(
              "[WhiteboardCommands] Unknown action:",
              command.action
            );
        }
      } catch (err) {
        console.error("[WhiteboardCommands] Error executing command:", err);
      }
    },
    []
  );

  const executeCommand = useCallback(
    async (command: WhiteboardCommand) => {
      // Handle open/close whiteboard
      if (command.action === "open_whiteboard") {
        console.log("[WhiteboardCommands] Opening whiteboard");
        setWhiteboardActive(true);
        return;
      }

      if (command.action === "close_whiteboard") {
        console.log("[WhiteboardCommands] Closing whiteboard");
        setWhiteboardActive(false);
        pendingCommands = [];
        return;
      }

      // For drawing commands, auto-open whiteboard if not active
      if (DRAWING_ACTIONS.has(command.action)) {
        const currentState = useAppStore.getState();
        if (!currentState.isWhiteboardActive) {
          console.log(
            "[WhiteboardCommands] Auto-opening whiteboard for:",
            command.action
          );
          setWhiteboardActive(true);
          // Queue the command — it will be executed once whiteboard is ready
          pendingCommands.push(command);
          return;
        }

        // Whiteboard is active, execute directly
        await executeFastboardCommand(command);
        return;
      }

      // Unknown non-drawing action
      console.warn("[WhiteboardCommands] Unhandled action:", command.action);
    },
    [setWhiteboardActive, executeFastboardCommand]
  );

  // Process pending commands once whiteboard becomes active and fastboard is ready
  useEffect(() => {
    if (!isWhiteboardActive || pendingCommands.length === 0) return;

    // Small delay to let Fastboard initialize after whiteboard opens
    const timer = setTimeout(async () => {
      const fastboard = getFastboardInstance();
      if (!fastboard) {
        console.warn(
          "[WhiteboardCommands] Fastboard not ready yet, retrying..."
        );
        // Retry after another delay
        const retryTimer = setTimeout(async () => {
          const queued = [...pendingCommands];
          pendingCommands = [];
          for (const cmd of queued) {
            await executeFastboardCommand(cmd);
          }
        }, 2000);
        return () => clearTimeout(retryTimer);
      }

      const queued = [...pendingCommands];
      pendingCommands = [];
      console.log(
        `[WhiteboardCommands] Executing ${queued.length} queued command(s)`
      );
      for (const cmd of queued) {
        await executeFastboardCommand(cmd);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isWhiteboardActive, executeFastboardCommand]);

  const pollCommands = useCallback(async () => {
    if (!channelId) return;

    try {
      const res = await fetch(
        `/api/whiteboard/commands?channelName=${encodeURIComponent(channelId)}`
      );
      if (!res.ok) return;

      const data = (await res.json()) as { commands: WhiteboardCommand[] };
      if (!data.commands || data.commands.length === 0) return;

      console.log(
        `[WhiteboardCommands] Received ${data.commands.length} command(s)`
      );

      for (const command of data.commands) {
        await executeCommand(command);
      }
    } catch (err) {
      console.debug("[WhiteboardCommands] Poll error:", err);
    }
  }, [channelId, executeCommand]);

  // Poll whenever agent is active (not just when whiteboard is active)
  // so we can receive open_whiteboard commands
  useEffect(() => {
    const shouldPoll = isAgentActive && channelId;

    if (shouldPoll) {
      console.log(
        "[WhiteboardCommands] Starting polling for channel:",
        channelId
      );
      pollCommands();
      intervalRef.current = setInterval(pollCommands, POLL_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) {
        console.log("[WhiteboardCommands] Stopping polling");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAgentActive, channelId, pollCommands]);
};

export default useWhiteboardCommands;
