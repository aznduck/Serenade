import Image from "next/image";

interface iMessageToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  className?: string;
  size?: number;
}

export function IMessageToggle({
  isEnabled,
  onToggle,
  className = "",
  size = 24
}: iMessageToggleProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300 flex-1 hover:bg-white/5 hover:scale-105 cursor-pointer"
      >
        <Image
          src={isEnabled ? "/assets/logos/imessage_color.png" : "/assets/logos/imessage_gray.png"}
          alt="iMessage"
          width={size}
          height={size}
          className={className}
        />
        <div className="text-left">
          <h3 className={`text-xl font-semibold transition-colors ${
            isEnabled ? "text-white" : "text-gray-400"
          }`}>
            Messages
          </h3>
          <p className={`text-sm transition-colors ${
            isEnabled ? "text-blue-400" : "text-gray-500"
          }`}>
            {isEnabled ? "Including recent messages" : "Click to include messages"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Recent conversations help personalize your song
          </p>
        </div>
      </button>
    </div>
  );
}