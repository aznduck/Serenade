import Image from "next/image";
import { X } from "lucide-react";

interface SpotifyLogoProps {
  isConnected: boolean;
  isConnecting?: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
  className?: string;
  size?: number;
}

export function SpotifyLogo({
  isConnected,
  isConnecting = false,
  onConnect,
  onDisconnect,
  className = "",
  size = 24
}: SpotifyLogoProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <button
        onClick={isConnected ? undefined : onConnect}
        disabled={isConnecting}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 flex-1 ${
          isConnected
            ? "cursor-default"
            : "hover:bg-white/5 hover:scale-105 cursor-pointer"
        }`}
      >
        <Image
          src={isConnected ? "/assets/logos/spotify_color.png" : "/assets/logos/spotify_gray.png"}
          alt="Spotify"
          width={size}
          height={size}
          className={className}
        />
        <div className="text-left">
          <h3 className={`text-xl font-semibold transition-colors ${
            isConnected ? "text-white" : "text-gray-400"
          }`}>
            Spotify
          </h3>
          {isConnecting ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              Connecting...
            </div>
          ) : (
            <p className={`text-sm transition-colors ${
              isConnected ? "text-green-400" : "text-gray-500"
            }`}>
              {isConnected ? "Connected" : "Click to connect"}
            </p>
          )}
        </div>
      </button>
      {isConnected && onDisconnect && (
        <button
          onClick={onDisconnect}
          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all duration-200 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}