import { useEffect, useRef, useCallback } from "react";
import { getFastboardInstance } from "@/components/Whiteboard";
import useAppStore from "@/store/useAppStore";

interface WhiteboardCommand {
  action: string;
  params: Record<string, unknown>;
}

const POLL_INTERVAL_MS = 500;

/**
 * Polls the whiteboard commands endpoint and executes them on Fastboard.
 * Only active when both whiteboard and agent are active.
 */
const useWhiteboardCommands = (): void => {
  const channelId = useAppStore((state) => state.channelId);
  const isWhiteboardActive = useAppStore((state) => state.isWhiteboardActive);
  const isAgentActive = useAppStore((state) => state.isAgentActive);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const executeCommand = useCallback(async (command: WhiteboardCommand) => {
    const fastboard = getFastboardInstance();
    if (!fastboard) {
      console.warn("[WhiteboardCommands] No fastboard instance available");
      return;
    }

    console.log("[WhiteboardCommands] Executing:", command.action, command.params);

    try {
      switch (command.action) {
        case "insert_image": {
          const { url, width, height } = command.params as {
            url: string;
            width?: number;
            height?: number;
          };
          if (!url) break;

          // insertImage on Fastboard: insert and lock the image into the scene
          const imgWidth = (width as number) ?? 800;
          const imgHeight = (height as number) ?? 600;
          await fastboard.insertImage(url);
          // Move the image to center of the view
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

          // Use Fastboard's text tool to insert text at position
          const room = fastboard.manager.mainView;
          if (room) {
            room.insertText(x ?? 100, y ?? 100, text);
          }
          console.log(`[WhiteboardCommands] Inserted text: "${text}" at (${x}, ${y})`);
          break;
        }

        case "clear_board": {
          fastboard.cleanCurrentScene();
          console.log("[WhiteboardCommands] Cleared board");
          break;
        }

        case "undo": {
          fastboard.undo();
          console.log("[WhiteboardCommands] Undo");
          break;
        }

        case "redo": {
          fastboard.redo();
          console.log("[WhiteboardCommands] Redo");
          break;
        }

        default:
          console.warn("[WhiteboardCommands] Unknown action:", command.action);
      }
    } catch (err) {
      console.error("[WhiteboardCommands] Error executing command:", err);
    }
  }, []);

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
      // Silently ignore fetch errors (network issues, etc.)
      console.debug("[WhiteboardCommands] Poll error:", err);
    }
  }, [channelId, executeCommand]);

  useEffect(() => {
    const shouldPoll = isWhiteboardActive && isAgentActive && channelId;

    if (shouldPoll) {
      console.log("[WhiteboardCommands] Starting polling for channel:", channelId);
      // Poll immediately, then on interval
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
  }, [isWhiteboardActive, isAgentActive, channelId, pollCommands]);
};

export default useWhiteboardCommands;
