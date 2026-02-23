// src/components/Whiteboard.tsx
import React, { useEffect } from "react";
import { useFastboard, Fastboard } from "@netless/fastboard-react/full";
import type { FastboardApp } from "@netless/fastboard-react/full";
import useAppStore from "@/store/useAppStore";

// Module scope — shared across hook instances (same pattern as localTracksRef in useAgora.ts)
let fastboardInstance: FastboardApp | null = null;

export function getFastboardInstance(): FastboardApp | null {
  return fastboardInstance;
}

interface WhiteboardProps {
  roomUuid: string;
  roomToken: string;
  uid: string;
}

const Whiteboard: React.FC<WhiteboardProps> = ({
  roomUuid,
  roomToken,
  uid,
}) => {
  const whiteboardAppIdentifier = useAppStore(
    (state) => state.whiteboardAppIdentifier
  );
  const whiteboardRegion = useAppStore((state) => state.whiteboardRegion);

  const fastboard = useFastboard(() => ({
    sdkConfig: {
      appIdentifier: whiteboardAppIdentifier,
      region: whiteboardRegion || "us-sv",
    },
    joinRoom: {
      uid: String(uid),
      uuid: roomUuid,
      roomToken,
    },
  }));

  // Expose fastboard instance at module scope for useWhiteboardCommands hook
  useEffect(() => {
    if (fastboard) {
      fastboardInstance = fastboard;
    }
    return () => {
      if (fastboardInstance === fastboard) {
        fastboardInstance = null;
      }
    };
  }, [fastboard]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (fastboard) {
        fastboard.destroy();
      }
    };
  }, [fastboard]);

  if (!roomUuid || !roomToken || !whiteboardAppIdentifier) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
        <p>Whiteboard credentials not available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Fastboard app={fastboard} />
    </div>
  );
};

export default Whiteboard;
