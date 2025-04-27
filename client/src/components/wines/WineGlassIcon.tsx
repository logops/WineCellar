import { cn, getWineTypeColorClass } from "@/lib/utils";

interface WineGlassIconProps {
  type: string;
  className?: string;
}

export default function WineGlassIcon({ type, className }: WineGlassIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={cn("h-8 w-8", getWineTypeColorClass(type), className)} 
      viewBox="0 0 20 20" 
      fill="currentColor"
      aria-label={`${type} wine`}
    >
      <path 
        fillRule="evenodd" 
        d="M10 2a1 1 0 011 1v1h3a1 1 0 110 2h-.17l-1.83 9.172a2 2 0 01-1.977 1.828H9.977a2 2 0 01-1.977-1.828L6.17 6H6a1 1 0 110-2h3V3a1 1 0 011-1z" 
        clipRule="evenodd" 
      />
    </svg>
  );
}
